using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Digest;

/// <summary>
/// Assembles <see cref="HouseholdDigest"/> content from the database. Pure data —
/// no rendering, no email. Mirrors the "next N days" attention rules used by the
/// Today/reminders endpoints and uses <see cref="DebtCalculator"/> for balances.
/// </summary>
public class DigestService
{
    private const int WindowDays = 5;
    private readonly AppDbContext _db;

    public DigestService(AppDbContext db) => _db = db;

    /// <summary>All households, each with members loaded — the scheduler's send list.</summary>
    public Task<List<Household>> GetHouseholdsAsync() =>
        _db.Households.Include(h => h.Members).ToListAsync();

    /// <summary>Users not in any household, for personal (solo) digests.</summary>
    public Task<List<ApplicationUser>> GetSoloUsersAsync() =>
        _db.Users.Where(u => u.HouseholdId == null).ToListAsync();

    public async Task<HouseholdDigest> BuildForHouseholdAsync(Household household, DateTime today)
    {
        var members = household.Members.Count > 0
            ? household.Members
            : await _db.Users.Where(u => u.HouseholdId == household.Id).ToListAsync();

        var memberIds = members.Select(m => m.Id).ToList();
        // Content is shared across the household, but only opted-in members get emailed.
        var emails = members.Where(m => m.DigestOptIn && m.Email is not null).Select(m => m.Email!).ToList();

        return await AssembleAsync(
            household.Name, emails, today,
            chores: _db.ChoreItems.Where(c => c.HouseholdId == household.Id).Include(c => c.AssignedTo),
            todos: _db.TodoItems.Where(t => t.HouseholdId == household.Id),
            events: _db.CalendarEvents.Where(e => e.HouseholdId == household.Id),
            grocery: _db.GroceryItems.Where(g => g.HouseholdId == household.Id),
            debts: _db.Debts.Where(d => memberIds.Contains(d.UserId)),
            notes: _db.HouseholdNotes.Where(n => n.HouseholdId == household.Id).Include(n => n.CreatedBy));
    }

    public async Task<HouseholdDigest> BuildForUserAsync(ApplicationUser user, DateTime today)
    {
        if (user.HouseholdId is Guid hid)
        {
            var household = await _db.Households.Include(h => h.Members).FirstAsync(h => h.Id == hid);
            return await BuildForHouseholdAsync(household, today);
        }

        var emails = user.Email is null || !user.DigestOptIn ? Array.Empty<string>() : new[] { user.Email };
        return await AssembleAsync(
            $"{user.DisplayName}'s Home", emails, today,
            chores: _db.ChoreItems.Where(c => c.CreatedByUserId == user.Id && c.HouseholdId == null).Include(c => c.AssignedTo),
            todos: _db.TodoItems.Where(t => t.CreatedByUserId == user.Id && t.HouseholdId == null),
            events: _db.CalendarEvents.Where(e => e.CreatedByUserId == user.Id && e.HouseholdId == null),
            grocery: _db.GroceryItems.Where(g => g.UserId == user.Id && g.HouseholdId == null),
            debts: _db.Debts.Where(d => d.UserId == user.Id),
            notes: _db.HouseholdNotes.Where(n => n.CreatedByUserId == user.Id && n.HouseholdId == null).Include(n => n.CreatedBy));
    }

    private async Task<HouseholdDigest> AssembleAsync(
        string name, IReadOnlyList<string> emails, DateTime today,
        IQueryable<ChoreItem> chores, IQueryable<TodoItem> todos,
        IQueryable<CalendarEvent> events, IQueryable<GroceryItem> grocery, IQueryable<Debt> debts,
        IQueryable<HouseholdNote> notes)
    {
        var choreList = await chores.ToListAsync();
        var todoList = await todos.ToListAsync();
        var eventList = await events.ToListAsync();
        var groceryList = await grocery.ToListAsync();
        var debtList = await debts.Include(d => d.Payments).ToListAsync();

        var items = new List<DigestItem>();

        foreach (var c in choreList.Where(c => !c.IsCompletedThisCycle))
        {
            var days = (c.NextDueDate.Date - today).Days;
            if (days > WindowDays) continue;
            items.Add(new DigestItem("chore", Severity(days), c.Name,
                $"{c.AssignedTo?.DisplayName ?? "Someone"}'s turn", c.NextDueDate.Date));
        }

        foreach (var t in todoList.Where(t => !t.IsCompleted && t.DueDate is not null))
        {
            var days = (t.DueDate!.Value.Date - today).Days;
            if (days > WindowDays) continue;
            items.Add(new DigestItem("todo", Severity(days), t.Title, $"{t.Priority} priority", t.DueDate.Value.Date));
        }

        foreach (var e in eventList.Where(e => e.StartDate.Date >= today))
        {
            var days = (e.StartDate.Date - today).Days;
            if (days > WindowDays) continue;
            items.Add(new DigestItem("event", days == 0 ? "due" : "upcoming", e.Title,
                e.IsAllDay ? "all day" : e.StartDate.ToString("HH:mm"), e.StartDate.Date));
        }

        var overdue = items.Where(i => i.Severity == "overdue").OrderBy(i => i.Date).ToList();
        var agenda = items.Where(i => i.Severity != "overdue")
            .OrderBy(i => i.Date).ThenBy(i => i.Title).ToList();

        var digestDebts = debtList
            .Select(d =>
            {
                var payments = d.Payments.Select(p => (p.PaidAt, p.Amount)).ToList();
                var balance = DebtCalculator.CurrentBalance(d.StartingAmount, d.InterestRate, payments, d.CreatedAt, today);
                return new DigestDebt(d.Name, balance, d.InterestRate,
                    Math.Round(DebtCalculator.MonthlyInterest(balance, d.InterestRate), 2),
                    NextDueLabel(d.DueDay, today));
            })
            .Where(d => d.Balance > 0)
            .OrderByDescending(d => d.Balance)
            .ToList();

        var totalOwed = digestDebts.Sum(d => d.Balance);
        var monthlyInterest = digestDebts.Sum(d => d.MonthlyInterest);
        var paidToDate = Math.Round(debtList.SelectMany(d => d.Payments).Sum(p => p.Amount), 2);

        var groceryItems = groceryList
            .Where(g => !g.IsChecked)
            .OrderBy(g => g.Category).ThenBy(g => g.Name)
            .Select(g => new DigestGrocery(g.Name, g.Quantity, g.Category))
            .ToList();

        // Pinned notes lead; a couple recent ones fill in. Keep it short for an email.
        var noteList = (await notes.ToListAsync())
            .OrderByDescending(n => n.Pinned).ThenByDescending(n => n.UpdatedAt)
            .Take(4)
            .Select(n => new DigestNote(n.Content, n.CreatedBy?.DisplayName ?? "someone"))
            .ToList();

        return new HouseholdDigest(name, today, emails, overdue, agenda,
            digestDebts, totalOwed, monthlyInterest, paidToDate, groceryItems, noteList);
    }

    private static string Severity(int days) => days < 0 ? "overdue" : days == 0 ? "due" : "upcoming";

    private static string NextDueLabel(int dueDay, DateTime today)
    {
        if (dueDay is < 1 or > 31) return "—";
        var day = Math.Min(dueDay, DateTime.DaysInMonth(today.Year, today.Month));
        var thisMonth = new DateTime(today.Year, today.Month, day);
        var next = thisMonth >= today
            ? thisMonth
            : new DateTime(today.AddMonths(1).Year, today.AddMonths(1).Month,
                Math.Min(dueDay, DateTime.DaysInMonth(today.AddMonths(1).Year, today.AddMonths(1).Month)));
        return next.ToString("MMM d");
    }
}
