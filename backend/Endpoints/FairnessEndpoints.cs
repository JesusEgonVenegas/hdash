using System.Security.Claims;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

/// <summary>
/// The Fairness Ledger: one read on "are we even?" this month, combining money
/// (who carried more than their fair share of costs) with chore-load (who did
/// more of the work). Money fairness respects the household's split mode.
/// </summary>
public static class FairnessEndpoints
{
    public static RouteGroupBuilder MapFairnessEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/fairness").RequireAuthorization();
        group.MapGet("/", GetFairness);
        return group;
    }

    private static async Task<IResult> GetFairness(AppDbContext db, ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Results.Unauthorized();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Results.Unauthorized();

        var members = user.HouseholdId is not null
            ? await db.Users.Where(u => u.HouseholdId == user.HouseholdId).ToListAsync()
            : new List<ApplicationUser> { user };

        var household = user.HouseholdId is not null
            ? await db.Households.FirstOrDefaultAsync(h => h.Id == user.HouseholdId)
            : null;
        var proportional = household?.SplitMode == "proportional";

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var incomes = members.ToDictionary(m => m.Id, m => m.Income ?? 0m);

        // --- MONEY: this month's shared expenses only (settlement transfers excluded). ---
        var expensesQ = user.HouseholdId is not null
            ? db.Expenses.Where(e => e.HouseholdId == user.HouseholdId)
            : db.Expenses.Where(e => e.PaidByUserId == user.Id && e.HouseholdId == null);
        var monthExpenses = (await expensesQ.Where(e => e.CreatedAt >= monthStart).ToListAsync())
            .Where(e => e.Participants().Contains(e.PaidByUserId))
            .ToList();

        var paid = members.ToDictionary(m => m.Id, _ => 0m);
        var fair = members.ToDictionary(m => m.Id, _ => 0m);
        foreach (var e in monthExpenses)
        {
            var parts = e.Participants();
            if (parts.Count == 0) continue;
            if (paid.ContainsKey(e.PaidByUserId)) paid[e.PaidByUserId] += e.Amount;

            // Same weighting rule as expense splitting: proportional only when every
            // participant has income on file, else this expense splits per head.
            var weights = parts.Select(p => incomes.GetValueOrDefault(p, 0m)).ToList();
            var useProp = proportional && weights.All(w => w > 0);
            var totalW = useProp ? weights.Sum() : parts.Count;
            for (var i = 0; i < parts.Count; i++)
            {
                var w = useProp ? weights[i] : 1m;
                if (fair.ContainsKey(parts[i])) fair[parts[i]] += e.Amount * w / totalW;
            }
        }
        var totalSpend = monthExpenses.Sum(e => e.Amount);

        // --- CHORES: completions logged this month, credited to whoever did them. ---
        var complQ = user.HouseholdId is not null
            ? db.ChoreCompletions.Where(c => c.HouseholdId == user.HouseholdId)
            : db.ChoreCompletions.Where(c => c.UserId == user.Id && c.HouseholdId == null);
        var monthCompletions = await complQ.Where(c => c.CompletedAt >= monthStart).ToListAsync();
        var choreCounts = members.ToDictionary(m => m.Id, m => monthCompletions.Count(c => c.UserId == m.Id));
        var totalChores = monthCompletions.Count;

        var rows = members.Select(m => new
        {
            userId = m.Id,
            name = m.DisplayName,
            color = m.Color,
            paid = Math.Round(paid[m.Id], 2),
            fairShare = Math.Round(fair[m.Id], 2),
            moneyNet = Math.Round(paid[m.Id] - fair[m.Id], 2), // + carried more than fair share
            chores = choreCounts[m.Id],
            choreShare = totalChores > 0 ? Math.Round(100.0 * choreCounts[m.Id] / totalChores, 0) : 0d,
        }).OrderByDescending(r => r.moneyNet).ToList();

        return Results.Ok(new
        {
            period = monthStart.ToString("MMMM yyyy"),
            splitMode = proportional ? "proportional" : "equal",
            totals = new { spend = Math.Round(totalSpend, 2), choreCount = totalChores },
            members = rows,
            verdict = Verdict(rows.Select(r => (r.name, r.moneyNet, r.chores)).ToList(), totalSpend, totalChores),
        });
    }

    // A single plain-English read on who's carrying what this month.
    private static string Verdict(List<(string name, decimal moneyNet, int chores)> rows, decimal spend, int chores)
    {
        if (rows.Count < 2) return "Just you here — nothing to balance.";
        if (spend == 0 && chores == 0) return "Nothing logged yet this month.";

        var moneyLeader = rows.OrderByDescending(r => r.moneyNet).First();
        var choreLeader = rows.OrderByDescending(r => r.chores).First();
        var moneyGap = spend > 0 && rows.Max(r => r.moneyNet) - rows.Min(r => r.moneyNet) > 0.01m;
        var choreGap = chores > 0 && rows.Max(r => r.chores) > rows.Min(r => r.chores);

        if (!moneyGap && !choreGap) return "Pretty balanced this month. ✓";
        if (moneyGap && !choreGap) return $"{moneyLeader.name} is carrying more of the costs this month.";
        if (!moneyGap && choreGap) return $"{choreLeader.name} is doing more of the chores this month.";
        if (moneyLeader.name == choreLeader.name)
            return $"{moneyLeader.name} is carrying the household this month — more costs AND more chores.";
        return $"{moneyLeader.name} covers more of the costs; {choreLeader.name} does more of the chores — you're splitting the load.";
    }
}
