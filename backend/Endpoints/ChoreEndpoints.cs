using System.Security.Claims;
using backend.Data;
using backend.DTOs.Chore;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class ChoreEndpoints
{
    private static readonly string[] ValidFrequencies = ["daily", "weekly", "biweekly", "monthly"];

    public static RouteGroupBuilder MapChoreEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/chores").RequireAuthorization();

        group.MapGet("/", GetChores);
        group.MapPost("/", CreateChore);
        group.MapPut("/{id}", UpdateChore);
        group.MapPut("/{id}/complete", CompleteChore);
        group.MapDelete("/{id}", DeleteChore);

        return group;
    }

    private static async Task<IResult> GetChores(
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        IQueryable<ChoreItem> query;

        if (user.HouseholdId is not null)
        {
            query = db.ChoreItems
                .Where(c => c.HouseholdId == user.HouseholdId)
                .Include(c => c.CreatedBy)
                .Include(c => c.AssignedTo);
        }
        else
        {
            query = db.ChoreItems
                .Where(c => c.CreatedByUserId == userId && c.HouseholdId == null);
        }

        var items = await query
            .OrderBy(c => c.IsCompletedThisCycle)
            .ThenBy(c => c.NextDueDate)
            .ThenBy(c => c.Name)
            .ToListAsync();

        return Results.Ok(items.Select(ToResponse));
    }

    private static async Task<IResult> CreateChore(
        CreateChoreRequest request,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new { error = "Chore name is required." });

        var frequency = ValidFrequencies.Contains(request.Frequency) ? request.Frequency : "weekly";

        var assigneeId = userId;

        // validate assignee is in same household
        if (request.AssignedToUserId is not null && user.HouseholdId is not null)
        {
            var assignee = await db.Users.FirstOrDefaultAsync(u => u.Id == request.AssignedToUserId);
            if (assignee is null || assignee.HouseholdId != user.HouseholdId)
                return Results.BadRequest(new { error = "Assignee must be in your household." });
            assigneeId = request.AssignedToUserId;
        }

        var item = new ChoreItem
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Frequency = frequency,
            CreatedByUserId = userId,
            AssignedToUserId = assigneeId,
            NextDueDate = CalculateNextDueDate(frequency, DateTime.UtcNow),
            HouseholdId = user.HouseholdId,
        };

        db.ChoreItems.Add(item);
        await db.SaveChangesAsync();

        // reload nav properties
        await db.Entry(item).Reference(c => c.CreatedBy).LoadAsync();
        await db.Entry(item).Reference(c => c.AssignedTo).LoadAsync();

        return Results.Ok(ToResponse(item));
    }

    private static async Task<IResult> UpdateChore(
        Guid id,
        UpdateChoreRequest request,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        var item = await db.ChoreItems
            .Include(c => c.CreatedBy)
            .Include(c => c.AssignedTo)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (item is null) return Results.NotFound();

        if (!CanAccess(user, item)) return Results.Forbid();

        if (request.Name is not null)
            item.Name = request.Name.Trim();
        if (request.Description is not null)
            item.Description = request.Description.Trim();
        if (request.Frequency is not null && ValidFrequencies.Contains(request.Frequency))
        {
            item.Frequency = request.Frequency;
            item.NextDueDate = CalculateNextDueDate(request.Frequency, DateTime.UtcNow);
        }
        if (request.AssignedToUserId is not null && user.HouseholdId is not null)
        {
            var assignee = await db.Users.FirstOrDefaultAsync(u => u.Id == request.AssignedToUserId);
            if (assignee is not null && assignee.HouseholdId == user.HouseholdId)
            {
                item.AssignedToUserId = request.AssignedToUserId;
                await db.Entry(item).Reference(c => c.AssignedTo).LoadAsync();
            }
        }

        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(ToResponse(item));
    }

    private static async Task<IResult> CompleteChore(
        Guid id,
        AppDbContext db,
        ClaimsPrincipal principal,
        backend.Services.Push.PushService push)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        var item = await db.ChoreItems
            .Include(c => c.CreatedBy)
            .Include(c => c.AssignedTo)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (item is null) return Results.NotFound();

        if (!CanAccess(user, item)) return Results.Forbid();

        // streak: on-time completions build it up; a late one restarts at 1
        var onTime = DateTime.UtcNow.Date <= item.NextDueDate.Date;
        item.Streak = onTime ? item.Streak + 1 : 1;

        // Log who actually did it, for chore-load fairness (the item itself keeps no history).
        db.ChoreCompletions.Add(new ChoreCompletion
        {
            ChoreItemId = item.Id,
            ChoreName = item.Name,
            UserId = user.Id,
            HouseholdId = item.HouseholdId,
            OnTime = onTime,
        });

        // mark as completed for this cycle
        item.LastCompletedAt = DateTime.UtcNow;
        item.IsCompletedThisCycle = true;
        item.NextDueDate = CalculateNextDueDate(item.Frequency, DateTime.UtcNow);

        // auto-rotate to next household member
        if (user.HouseholdId is not null)
        {
            var members = await db.Users
                .Where(u => u.HouseholdId == user.HouseholdId)
                .OrderBy(u => u.DisplayName)
                .ThenBy(u => u.Id)
                .ToListAsync();

            if (members.Count > 1)
            {
                var currentIndex = members.FindIndex(m => m.Id == item.AssignedToUserId);
                var nextIndex = (currentIndex + 1) % members.Count;
                item.AssignedToUserId = members[nextIndex].Id;
                item.IsCompletedThisCycle = false; // reset for new assignee
            }
        }

        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // reload assignee
        await db.Entry(item).Reference(c => c.AssignedTo).LoadAsync();

        // Nudge the next person it rotated to (never yourself).
        if (item.AssignedToUserId != userId)
            await push.SendToUserAsync(item.AssignedToUserId, "Your turn 🧹", $"{item.Name} — you're up next.", "/chores");

        return Results.Ok(ToResponse(item));
    }

    private static async Task<IResult> DeleteChore(
        Guid id,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        var item = await db.ChoreItems.FindAsync(id);

        if (item is null) return Results.NotFound();

        if (!CanAccess(user, item)) return Results.Forbid();

        db.ChoreItems.Remove(item);
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Chore deleted." });
    }

    private static DateTime CalculateNextDueDate(string frequency, DateTime from)
    {
        return frequency switch
        {
            "daily" => from.AddDays(1),
            "weekly" => from.AddDays(7),
            "biweekly" => from.AddDays(14),
            "monthly" => from.AddMonths(1),
            _ => from.AddDays(7),
        };
    }

    private static bool CanAccess(ApplicationUser user, ChoreItem item)
    {
        if (user.HouseholdId is not null && item.HouseholdId == user.HouseholdId)
            return true;

        if (user.HouseholdId is null && item.CreatedByUserId == user.Id && item.HouseholdId == null)
            return true;

        return false;
    }

    private static object ToResponse(ChoreItem c) => new
    {
        c.Id,
        c.Name,
        c.Description,
        c.Frequency,
        c.CreatedByUserId,
        CreatedByName = c.CreatedBy?.DisplayName,
        c.AssignedToUserId,
        AssignedToName = c.AssignedTo?.DisplayName,
        AssignedToColor = c.AssignedTo?.Color,
        c.IsCompletedThisCycle,
        c.NextDueDate,
        c.LastCompletedAt,
        c.Streak,
        c.CreatedAt,
        c.UpdatedAt,
    };
}
