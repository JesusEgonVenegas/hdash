using System.Security.Claims;
using backend.Data;
using backend.DTOs.Todo;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class TodoEndpoints
{
    public static RouteGroupBuilder MapTodoEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/todos").RequireAuthorization();

        group.MapGet("/", GetTodos);
        group.MapPost("/", CreateTodo);
        group.MapPut("/{id}", UpdateTodo);
        group.MapPut("/{id}/toggle", ToggleTodo);
        group.MapDelete("/{id}", DeleteTodo);
        group.MapDelete("/completed", ClearCompleted);

        return group;
    }

    private static async Task<IResult> GetTodos(
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        IQueryable<TodoItem> query;

        if (user.HouseholdId is not null)
        {
            query = db.TodoItems
                .Where(t => t.HouseholdId == user.HouseholdId)
                .Include(t => t.CreatedBy)
                .Include(t => t.AssignedTo);
        }
        else
        {
            query = db.TodoItems
                .Where(t => t.CreatedByUserId == userId && t.HouseholdId == null);
        }

        var items = await query
            .OrderBy(t => t.IsCompleted)
            .ThenBy(t => t.Priority == "high" ? 0 : t.Priority == "medium" ? 1 : 2)
            .ThenBy(t => t.DueDate ?? DateTime.MaxValue)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync();

        return Results.Ok(items.Select(ToResponse));
    }

    private static async Task<IResult> CreateTodo(
        CreateTodoRequest request,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Title))
            return Results.BadRequest(new { error = "Title is required." });

        var validPriorities = new[] { "low", "medium", "high" };
        var priority = validPriorities.Contains(request.Priority) ? request.Priority : "medium";

        // validate assignee is in same household
        if (request.AssignedToUserId is not null && user.HouseholdId is not null)
        {
            var assignee = await db.Users.FirstOrDefaultAsync(u => u.Id == request.AssignedToUserId);
            if (assignee is null || assignee.HouseholdId != user.HouseholdId)
                return Results.BadRequest(new { error = "Assignee must be in your household." });
        }

        var item = new TodoItem
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Priority = priority,
            DueDate = request.DueDate,
            CreatedByUserId = userId,
            AssignedToUserId = user.HouseholdId is not null ? request.AssignedToUserId : null,
            HouseholdId = user.HouseholdId,
        };

        db.TodoItems.Add(item);
        await db.SaveChangesAsync();

        // reload with nav properties
        await db.Entry(item).Reference(t => t.CreatedBy).LoadAsync();
        if (item.AssignedToUserId is not null)
            await db.Entry(item).Reference(t => t.AssignedTo).LoadAsync();

        return Results.Ok(ToResponse(item));
    }

    private static async Task<IResult> UpdateTodo(
        Guid id,
        UpdateTodoRequest request,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        var item = await db.TodoItems
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedTo)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (item is null) return Results.NotFound();

        if (!CanAccess(user, item)) return Results.Forbid();

        if (request.Title is not null)
            item.Title = request.Title.Trim();
        if (request.Description is not null)
            item.Description = request.Description.Trim();
        if (request.IsCompleted is not null)
            item.IsCompleted = request.IsCompleted.Value;
        if (request.Priority is not null)
        {
            var validPriorities = new[] { "low", "medium", "high" };
            if (validPriorities.Contains(request.Priority))
                item.Priority = request.Priority;
        }
        if (request.DueDate is not null)
            item.DueDate = request.DueDate;
        if (request.AssignedToUserId is not null && user.HouseholdId is not null)
        {
            var assignee = await db.Users.FirstOrDefaultAsync(u => u.Id == request.AssignedToUserId);
            if (assignee is not null && assignee.HouseholdId == user.HouseholdId)
                item.AssignedToUserId = request.AssignedToUserId;
        }

        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // reload assignee if changed
        if (item.AssignedToUserId is not null)
            await db.Entry(item).Reference(t => t.AssignedTo).LoadAsync();

        return Results.Ok(ToResponse(item));
    }

    private static async Task<IResult> ToggleTodo(
        Guid id,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        var item = await db.TodoItems
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedTo)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (item is null) return Results.NotFound();

        if (!CanAccess(user, item)) return Results.Forbid();

        item.IsCompleted = !item.IsCompleted;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(ToResponse(item));
    }

    private static async Task<IResult> DeleteTodo(
        Guid id,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        var item = await db.TodoItems.FindAsync(id);

        if (item is null) return Results.NotFound();

        if (!CanAccess(user, item)) return Results.Forbid();

        db.TodoItems.Remove(item);
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Todo deleted." });
    }

    private static async Task<IResult> ClearCompleted(
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        IQueryable<TodoItem> query;

        if (user.HouseholdId is not null)
        {
            query = db.TodoItems
                .Where(t => t.HouseholdId == user.HouseholdId && t.IsCompleted);
        }
        else
        {
            query = db.TodoItems
                .Where(t => t.CreatedByUserId == userId && t.HouseholdId == null && t.IsCompleted);
        }

        var completed = await query.ToListAsync();
        db.TodoItems.RemoveRange(completed);
        await db.SaveChangesAsync();

        return Results.Ok(new { removed = completed.Count });
    }

    private static bool CanAccess(ApplicationUser user, TodoItem item)
    {
        if (user.HouseholdId is not null && item.HouseholdId == user.HouseholdId)
            return true;

        if (user.HouseholdId is null && item.CreatedByUserId == user.Id && item.HouseholdId == null)
            return true;

        return false;
    }

    private static object ToResponse(TodoItem t) => new
    {
        t.Id,
        t.Title,
        t.Description,
        t.IsCompleted,
        t.Priority,
        t.DueDate,
        t.CreatedByUserId,
        CreatedByName = t.CreatedBy?.DisplayName,
        t.AssignedToUserId,
        AssignedToName = t.AssignedTo?.DisplayName,
        t.CreatedAt,
        t.UpdatedAt,
    };
}
