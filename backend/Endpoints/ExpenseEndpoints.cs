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
        return group;
    }

    public record CreateExpenseRequest(string Description, decimal Amount, string? PaidByUserId, List<string>? ParticipantIds);

    private static async Task<IResult> GetExpenses(AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        var expenses = await Scoped(db, user).Include(e => e.PaidBy).OrderByDescending(e => e.CreatedAt).ToListAsync();
        var names = await MemberNames(db, user);

        // Net balance per user: positive => owed money, negative => owes.
        var net = names.Keys.ToDictionary(id => id, _ => 0m);
        foreach (var e in expenses)
        {
            var parts = e.Participants();
            if (parts.Count == 0) continue;
            var share = e.Amount / parts.Count;
            if (net.ContainsKey(e.PaidByUserId)) net[e.PaidByUserId] += e.Amount;
            foreach (var p in parts)
                if (net.ContainsKey(p)) net[p] -= share;
        }

        var balances = net
            .Select(kv => new { userId = kv.Key, name = names[kv.Key], net = Math.Round(kv.Value, 2) })
            .Where(b => b.net != 0)
            .OrderByDescending(b => b.net)
            .ToList();

        return Results.Ok(new
        {
            expenses = expenses.Select(e => new
            {
                e.Id,
                e.Description,
                e.Amount,
                e.PaidByUserId,
                PaidByName = e.PaidBy?.DisplayName,
                ParticipantIds = e.Participants(),
                Share = e.Participants().Count > 0 ? Math.Round(e.Amount / e.Participants().Count, 2) : e.Amount,
                e.CreatedAt,
            }),
            balances,
            settlements = SettleUp(net, names),
        });
    }

    private static async Task<IResult> CreateExpense(CreateExpenseRequest req, AppDbContext db, ClaimsPrincipal principal)
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
            PaidByUserId = payer,
            ParticipantIds = string.Join(",", participants),
            HouseholdId = user.HouseholdId,
        };

        db.Expenses.Add(expense);
        await db.SaveChangesAsync();
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

    private static IQueryable<Expense> Scoped(AppDbContext db, ApplicationUser user) =>
        user.HouseholdId is not null
            ? db.Expenses.Where(e => e.HouseholdId == user.HouseholdId)
            : db.Expenses.Where(e => e.PaidByUserId == user.Id && e.HouseholdId == null);

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
