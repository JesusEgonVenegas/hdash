using backend.Data;
using backend.Services;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

/// <summary>
/// Cross-module aggregates: the "Today" dashboard and the flattened reminders
/// feed. Both answer "what in this household needs attention right now" by
/// pulling from chores, todos, calendar, debts and grocery in one shot.
/// </summary>
public static class TodayEndpoints
{
    // How many days ahead a debt due-day or event counts as "upcoming".
    private const int UpcomingWindowDays = 5;

    public static RouteGroupBuilder MapTodayEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api").RequireAuthorization();
        group.MapGet("/today", GetToday);
        group.MapGet("/reminders", GetReminders);
        return group;
    }

    private static async Task<IResult> GetToday(AppDbContext db, System.Security.Claims.ClaimsPrincipal principal)
    {
        var scope = await HouseholdScope.ResolveAsync(db, principal);
        if (scope is null) return Results.Unauthorized();

        var snapshot = await LoadAsync(db, scope);
        var today = DateTime.UtcNow.Date;

        var chores = snapshot.Chores
            .Where(c => !c.IsCompletedThisCycle && c.NextDueDate.Date <= today)
            .OrderBy(c => c.NextDueDate)
            .Select(c => new
            {
                c.Id,
                c.Name,
                AssignedToName = c.AssignedTo?.DisplayName,
                c.NextDueDate,
                Overdue = c.NextDueDate.Date < today,
            })
            .ToList();

        var todos = snapshot.Todos
            .Where(t => !t.IsCompleted && t.DueDate is not null && t.DueDate.Value.Date <= today)
            .OrderBy(t => t.DueDate)
            .Select(t => new
            {
                t.Id,
                t.Title,
                t.Priority,
                t.DueDate,
                Overdue = t.DueDate!.Value.Date < today,
            })
            .ToList();

        var events = snapshot.Events
            .Where(e => e.StartDate.Date == today)
            .OrderBy(e => e.StartDate)
            .Select(e => new { e.Id, e.Title, e.StartDate, e.IsAllDay, e.Color })
            .ToList();

        var debtsDue = snapshot.Debts
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.MinPayment,
                d.DueDay,
                Balance = DebtCalculator.CurrentBalance(
                    d.StartingAmount, d.InterestRate,
                    d.Payments.Select(p => (p.PaidAt, p.Amount)), d.CreatedAt, today),
                DaysUntilDue = DaysUntilDueDay(d.DueDay, today),
            })
            .Where(d => d.Balance > 0 && d.DaysUntilDue is >= 0 and <= UpcomingWindowDays)
            .OrderBy(d => d.DaysUntilDue)
            .ToList();

        var groceryOutstanding = snapshot.Grocery.Count(g => !g.IsChecked);

        return Results.Ok(new
        {
            Date = today,
            Chores = chores,
            Todos = todos,
            Events = events,
            DebtsDue = debtsDue,
            GroceryOutstanding = groceryOutstanding,
            Counts = new
            {
                Chores = chores.Count,
                Todos = todos.Count,
                Events = events.Count,
                DebtsDue = debtsDue.Count,
                Grocery = groceryOutstanding,
            },
        });
    }

    private static async Task<IResult> GetReminders(AppDbContext db, System.Security.Claims.ClaimsPrincipal principal)
    {
        var scope = await HouseholdScope.ResolveAsync(db, principal);
        if (scope is null) return Results.Unauthorized();

        var snapshot = await LoadAsync(db, scope);
        var today = DateTime.UtcNow.Date;
        var reminders = new List<Reminder>();

        foreach (var c in snapshot.Chores.Where(c => !c.IsCompletedThisCycle))
        {
            var days = (c.NextDueDate.Date - today).Days;
            if (days > UpcomingWindowDays) continue;
            reminders.Add(new Reminder(
                "chore", Severity(days), c.Name,
                $"{(c.AssignedTo?.DisplayName ?? "Someone")}'s turn", c.Id, c.NextDueDate.Date));
        }

        foreach (var t in snapshot.Todos.Where(t => !t.IsCompleted && t.DueDate is not null))
        {
            var days = (t.DueDate!.Value.Date - today).Days;
            if (days > UpcomingWindowDays) continue;
            reminders.Add(new Reminder(
                "todo", Severity(days), t.Title, $"{t.Priority} priority", t.Id, t.DueDate.Value.Date));
        }

        foreach (var e in snapshot.Events.Where(e => e.StartDate.Date >= today))
        {
            var days = (e.StartDate.Date - today).Days;
            if (days > UpcomingWindowDays) continue;
            reminders.Add(new Reminder(
                "event", days == 0 ? "due" : "upcoming", e.Title,
                e.IsAllDay ? "all day" : e.StartDate.ToString("HH:mm"), e.Id, e.StartDate.Date));
        }

        foreach (var d in snapshot.Debts)
        {
            var balance = DebtCalculator.CurrentBalance(
                d.StartingAmount, d.InterestRate,
                d.Payments.Select(p => (p.PaidAt, p.Amount)), d.CreatedAt, today);
            if (balance <= 0) continue;
            var days = DaysUntilDueDay(d.DueDay, today);
            if (days is null || days > UpcomingWindowDays) continue;
            reminders.Add(new Reminder(
                "debt", Severity(days.Value), $"{d.Name} payment",
                $"min ${d.MinPayment:0.##} due", d.Id, today.AddDays(days.Value)));
        }

        var ordered = reminders
            .OrderBy(r => SeverityRank(r.Severity))
            .ThenBy(r => r.Date)
            .ToList();

        return Results.Ok(new { Count = ordered.Count, Items = ordered });
    }

    // ---- helpers ----

    private record Snapshot(
        List<Models.ChoreItem> Chores,
        List<Models.TodoItem> Todos,
        List<Models.CalendarEvent> Events,
        List<Models.Debt> Debts,
        List<Models.GroceryItem> Grocery);

    private static async Task<Snapshot> LoadAsync(AppDbContext db, HouseholdScope.Scope scope)
    {
        var hid = scope.User.HouseholdId;

        // Household entities: scope by household when in one, else the user's own personal items.
        var chores = await (hid is not null
            ? db.ChoreItems.Where(c => c.HouseholdId == hid)
            : db.ChoreItems.Where(c => c.CreatedByUserId == scope.User.Id && c.HouseholdId == null))
            .Include(c => c.AssignedTo).ToListAsync();

        var todos = await (hid is not null
            ? db.TodoItems.Where(t => t.HouseholdId == hid)
            : db.TodoItems.Where(t => t.CreatedByUserId == scope.User.Id && t.HouseholdId == null))
            .ToListAsync();

        var events = await (hid is not null
            ? db.CalendarEvents.Where(e => e.HouseholdId == hid)
            : db.CalendarEvents.Where(e => e.CreatedByUserId == scope.User.Id && e.HouseholdId == null))
            .ToListAsync();

        var grocery = await (hid is not null
            ? db.GroceryItems.Where(g => g.HouseholdId == hid)
            : db.GroceryItems.Where(g => g.UserId == scope.User.Id && g.HouseholdId == null))
            .ToListAsync();

        // Debts are per-user: everyone in the household.
        var debts = await db.Debts
            .Where(d => scope.MemberIds.Contains(d.UserId))
            .Include(d => d.Payments)
            .ToListAsync();

        return new Snapshot(chores, todos, events, debts, grocery);
    }

    /// <summary>Days until the next occurrence of a monthly due-day (0 = today), or null if invalid.</summary>
    private static int? DaysUntilDueDay(int dueDay, DateTime today)
    {
        if (dueDay is < 1 or > 31) return null;

        var day = Math.Min(dueDay, DateTime.DaysInMonth(today.Year, today.Month));
        var thisMonth = new DateTime(today.Year, today.Month, day);
        var target = thisMonth >= today
            ? thisMonth
            : new DateTime(today.AddMonths(1).Year, today.AddMonths(1).Month,
                Math.Min(dueDay, DateTime.DaysInMonth(today.AddMonths(1).Year, today.AddMonths(1).Month)));
        return (target - today).Days;
    }

    private static string Severity(int days) => days < 0 ? "overdue" : days == 0 ? "due" : "upcoming";

    private static int SeverityRank(string severity) => severity switch
    {
        "overdue" => 0,
        "due" => 1,
        _ => 2,
    };

    private record Reminder(string Type, string Severity, string Title, string Detail, Guid RefId, DateTime Date);
}
