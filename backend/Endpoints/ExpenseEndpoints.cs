using System.Security.Claims;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class ExpenseEndpoints
{
    public static RouteGroupBuilder MapExpenseEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/expenses").RequireAuthorization();
        group.MapGet("/", GetExpenses);
        group.MapPost("/", CreateExpense);
        group.MapDelete("/{id}", DeleteExpense);
        group.MapGet("/recurring", GetRecurring);
        group.MapPost("/recurring", CreateRecurring);
        group.MapDelete("/recurring/{id}", DeleteRecurring);
        return group;
    }

    public record CreateExpenseRequest(string Description, decimal Amount, string? PaidByUserId, List<string>? ParticipantIds, string? Category = null);
    public record CreateRecurringRequest(string Description, decimal Amount, string Cadence, string? PaidByUserId, List<string>? ParticipantIds, string? Category = null);

    private static string? NormalizeCategory(string? c)
    {
        c = c?.Trim();
        return string.IsNullOrEmpty(c) ? null : char.ToUpper(c[0]) + c[1..].ToLower();
    }

    private static async Task<IResult> GetExpenses(AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        // Spawn any due recurring instances before computing balances.
        await MaterializeDueAsync(db, user);

        var expenses = await Scoped(db, user).Include(e => e.PaidBy).OrderByDescending(e => e.CreatedAt).ToListAsync();
        var memberList = await MemberList(db, user);
        var names = memberList.ToDictionary(m => m.Id, m => m.DisplayName);
        var incomes = memberList.ToDictionary(m => m.Id, m => m.Income ?? 0m);

        // Proportional splitting divides each expense by member income instead of per-head.
        var household = user.HouseholdId is not null
            ? await db.Households.FirstOrDefaultAsync(h => h.Id == user.HouseholdId)
            : null;
        var proportional = household?.SplitMode == "proportional";

        // Net balance per user: positive => owed money, negative => owes.
        var net = names.Keys.ToDictionary(id => id, _ => 0m);
        foreach (var e in expenses)
        {
            var parts = e.Participants();
            if (parts.Count == 0) continue;
            if (net.ContainsKey(e.PaidByUserId)) net[e.PaidByUserId] += e.Amount;

            // Weight per participant. Proportional only kicks in when every participant has
            // a positive income on file; otherwise this expense falls back to an equal split
            // (so nobody's share collapses to ~0 just because they haven't entered income).
            var weights = parts.Select(p => incomes.GetValueOrDefault(p, 0m)).ToList();
            var useProp = proportional && weights.All(w => w > 0);
            var totalWeight = useProp ? weights.Sum() : parts.Count;
            for (var i = 0; i < parts.Count; i++)
            {
                var w = useProp ? weights[i] : 1m;
                var share = e.Amount * w / totalWeight;
                if (net.ContainsKey(parts[i])) net[parts[i]] -= share;
            }
        }

        var balances = net
            .Select(kv => new { userId = kv.Key, name = names[kv.Key], net = Math.Round(kv.Value, 2) })
            .Where(b => b.net != 0)
            .OrderByDescending(b => b.net)
            .ToList();

        // Month spend = real expenses only (a settlement transfer has the payer NOT among participants).
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var spend = expenses.Where(e => e.Participants().Contains(e.PaidByUserId)).ToList();
        var monthSpend = spend.Where(e => e.CreatedAt >= monthStart).ToList();

        return Results.Ok(new
        {
            expenses = expenses.Select(e => new
            {
                e.Id,
                e.Description,
                e.Amount,
                e.PaidByUserId,
                PaidByName = e.PaidBy?.DisplayName,
                PaidByColor = e.PaidBy?.Color,
                e.Category,
                ParticipantIds = e.Participants(),
                Share = e.Participants().Count > 0 ? Math.Round(e.Amount / e.Participants().Count, 2) : e.Amount,
                e.CreatedAt,
            }),
            balances,
            settlements = SettleUp(net, names),
            splitMode = proportional ? "proportional" : "equal",
            summary = new
            {
                monthTotal = Math.Round(monthSpend.Sum(e => e.Amount), 2),
                monthCount = monthSpend.Count,
                byCategory = monthSpend
                    .GroupBy(e => e.Category ?? "Uncategorized")
                    .Select(g => new { category = g.Key, total = Math.Round(g.Sum(e => e.Amount), 2) })
                    .OrderByDescending(x => x.total)
                    .ToList(),
            },
        });
    }

    private static async Task<IResult> CreateExpense(CreateExpenseRequest req, AppDbContext db, ClaimsPrincipal principal, backend.Services.Push.PushService push)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();
        if (string.IsNullOrWhiteSpace(req.Description)) return Results.BadRequest(new { error = "Description is required." });
        if (req.Amount <= 0) return Results.BadRequest(new { error = "Amount must be positive." });

        var members = await MemberNames(db, user);
        var payer = req.PaidByUserId is not null && members.ContainsKey(req.PaidByUserId) ? req.PaidByUserId : user.Id;

        // Default: split among everyone. Keep only valid member IDs.
        var participants = (req.ParticipantIds ?? members.Keys.ToList())
            .Where(members.ContainsKey).Distinct().ToList();
        if (participants.Count == 0) participants.Add(user.Id);

        var expense = new Expense
        {
            Description = req.Description.Trim(),
            Amount = req.Amount,
            Category = NormalizeCategory(req.Category),
            PaidByUserId = payer,
            ParticipantIds = string.Join(",", participants),
            HouseholdId = user.HouseholdId,
        };

        db.Expenses.Add(expense);
        await db.SaveChangesAsync();

        // A settlement transfer = payer pays a single other person and isn't a participant.
        // Let the person who got paid know they're square.
        if (participants.Count == 1 && !participants.Contains(payer) && participants[0] != payer)
            await push.SendToUserAsync(participants[0], "You got paid 💸",
                $"{members.GetValueOrDefault(payer, "Someone")} settled up with you — ${expense.Amount:0.##}.", "/expenses");

        return Results.Ok(new { expense.Id });
    }

    private static async Task<IResult> DeleteExpense(Guid id, AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == id);
        if (expense is null) return Results.NotFound();

        var ok = user.HouseholdId is not null
            ? expense.HouseholdId == user.HouseholdId
            : expense.PaidByUserId == user.Id && expense.HouseholdId == null;
        if (!ok) return Results.Forbid();

        db.Expenses.Remove(expense);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Expense removed." });
    }

    // Greedy settle-up: match the biggest debtor to the biggest creditor until square.
    private static List<object> SettleUp(Dictionary<string, decimal> net, Dictionary<string, string> names)
    {
        var debtors = net.Where(kv => Math.Round(kv.Value, 2) < 0)
            .Select(kv => (id: kv.Key, amt: -Math.Round(kv.Value, 2))).OrderByDescending(x => x.amt).ToList();
        var creditors = net.Where(kv => Math.Round(kv.Value, 2) > 0)
            .Select(kv => (id: kv.Key, amt: Math.Round(kv.Value, 2))).OrderByDescending(x => x.amt).ToList();

        var settlements = new List<object>();
        int i = 0, j = 0;
        while (i < debtors.Count && j < creditors.Count)
        {
            var pay = Math.Min(debtors[i].amt, creditors[j].amt);
            if (pay > 0)
                settlements.Add(new
                {
                    fromId = debtors[i].id, fromName = names[debtors[i].id],
                    toId = creditors[j].id, toName = names[creditors[j].id],
                    amount = Math.Round(pay, 2),
                });
            debtors[i] = (debtors[i].id, debtors[i].amt - pay);
            creditors[j] = (creditors[j].id, creditors[j].amt - pay);
            if (debtors[i].amt <= 0) i++;
            if (creditors[j].amt <= 0) j++;
        }
        return settlements;
    }

    private static async Task<IResult> GetRecurring(AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();
        var names = await MemberNames(db, user);

        var list = await ScopedRecurring(db, user).OrderBy(r => r.NextRunDate).ToListAsync();
        return Results.Ok(list.Select(r => new
        {
            r.Id, r.Description, r.Amount, r.Cadence, r.NextRunDate,
            r.PaidByUserId,
            PaidByName = names.GetValueOrDefault(r.PaidByUserId, "someone"),
            ParticipantIds = r.ParticipantIds.Split(',', StringSplitOptions.RemoveEmptyEntries),
        }));
    }

    private static async Task<IResult> CreateRecurring(CreateRecurringRequest req, AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();
        if (string.IsNullOrWhiteSpace(req.Description)) return Results.BadRequest(new { error = "Description is required." });
        if (req.Amount <= 0) return Results.BadRequest(new { error = "Amount must be positive." });

        var members = await MemberNames(db, user);
        var payer = req.PaidByUserId is not null && members.ContainsKey(req.PaidByUserId) ? req.PaidByUserId : user.Id;
        var participants = (req.ParticipantIds ?? members.Keys.ToList()).Where(members.ContainsKey).Distinct().ToList();
        if (participants.Count == 0) participants.Add(user.Id);
        var cadence = req.Cadence is "weekly" or "monthly" ? req.Cadence : "monthly";

        db.RecurringExpenses.Add(new RecurringExpense
        {
            Description = req.Description.Trim(),
            Amount = req.Amount,
            Category = NormalizeCategory(req.Category),
            Cadence = cadence,
            PaidByUserId = payer,
            ParticipantIds = string.Join(",", participants),
            NextRunDate = NextFrom(cadence, DateTime.UtcNow.Date),
            HouseholdId = user.HouseholdId,
        });
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Recurring expense added." });
    }

    private static async Task<IResult> DeleteRecurring(Guid id, AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        var r = await db.RecurringExpenses.FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return Results.NotFound();
        var ok = user.HouseholdId is not null ? r.HouseholdId == user.HouseholdId : r.PaidByUserId == user.Id && r.HouseholdId == null;
        if (!ok) return Results.Forbid();

        db.RecurringExpenses.Remove(r);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Recurring expense removed." });
    }

    // Turn every due recurring template into real expenses (catching up if several periods passed).
    private static async Task MaterializeDueAsync(AppDbContext db, ApplicationUser user)
    {
        var today = DateTime.UtcNow.Date;
        var due = await ScopedRecurring(db, user).Where(r => r.NextRunDate <= today).ToListAsync();
        if (due.Count == 0) return;

        foreach (var r in due)
        {
            var guard = 0;
            while (r.NextRunDate <= today && guard++ < 120)
            {
                db.Expenses.Add(new Expense
                {
                    Description = r.Description,
                    Amount = r.Amount,
                    Category = r.Category,
                    PaidByUserId = r.PaidByUserId,
                    ParticipantIds = r.ParticipantIds,
                    HouseholdId = r.HouseholdId,
                    CreatedAt = r.NextRunDate,
                });
                r.NextRunDate = NextFrom(r.Cadence, r.NextRunDate);
            }
        }
        await db.SaveChangesAsync();
    }

    private static DateTime NextFrom(string cadence, DateTime from) =>
        cadence == "weekly" ? from.AddDays(7) : from.AddMonths(1);

    private static IQueryable<RecurringExpense> ScopedRecurring(AppDbContext db, ApplicationUser user) =>
        user.HouseholdId is not null
            ? db.RecurringExpenses.Where(r => r.HouseholdId == user.HouseholdId)
            : db.RecurringExpenses.Where(r => r.PaidByUserId == user.Id && r.HouseholdId == null);

    private static IQueryable<Expense> Scoped(AppDbContext db, ApplicationUser user) =>
        user.HouseholdId is not null
            ? db.Expenses.Where(e => e.HouseholdId == user.HouseholdId)
            : db.Expenses.Where(e => e.PaidByUserId == user.Id && e.HouseholdId == null);

    private static async Task<List<ApplicationUser>> MemberList(AppDbContext db, ApplicationUser user) =>
        user.HouseholdId is not null
            ? await db.Users.Where(u => u.HouseholdId == user.HouseholdId).ToListAsync()
            : new List<ApplicationUser> { user };

    private static async Task<Dictionary<string, string>> MemberNames(AppDbContext db, ApplicationUser user) =>
        user.HouseholdId is not null
            ? await db.Users.Where(u => u.HouseholdId == user.HouseholdId).ToDictionaryAsync(u => u.Id, u => u.DisplayName)
            : new Dictionary<string, string> { [user.Id] = user.DisplayName };

    private static async Task<ApplicationUser?> CurrentUser(AppDbContext db, ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return userId is null ? null : await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
    }
}
