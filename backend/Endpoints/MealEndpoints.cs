using System.Security.Claims;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class MealEndpoints
{
    private static readonly string[] Slots = ["breakfast", "lunch", "dinner"];

    public static RouteGroupBuilder MapMealEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/meals").RequireAuthorization();
        group.MapGet("/", GetMeals);
        group.MapPost("/", CreateMeal);
        group.MapPut("/{id}", UpdateMeal);
        group.MapDelete("/{id}", DeleteMeal);
        group.MapPost("/{id}/to-grocery", PushToGrocery);
        return group;
    }

    public record CreateMealRequest(DateTime Date, string Slot, string Title, string? Ingredients);
    public record UpdateMealRequest(string? Slot, string? Title, string? Ingredients);

    // GET /api/meals?week=2026-07-01 -> meals in that 7-day window
    private static async Task<IResult> GetMeals(AppDbContext db, ClaimsPrincipal principal, string? week)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        var q = Scoped(db, user).Include(m => m.CreatedBy).AsQueryable();
        if (!string.IsNullOrEmpty(week) && DateTime.TryParse(week, out var start))
        {
            var end = start.Date.AddDays(7);
            q = q.Where(m => m.Date >= start.Date && m.Date < end);
        }

        var meals = await q.OrderBy(m => m.Date).Select(m => Project(m)).ToListAsync();
        return Results.Ok(meals);
    }

    private static async Task<IResult> CreateMeal(CreateMealRequest req, AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();
        if (string.IsNullOrWhiteSpace(req.Title)) return Results.BadRequest(new { error = "A meal needs a name." });

        var meal = new Meal
        {
            Date = req.Date.Date,
            Slot = Slots.Contains(req.Slot) ? req.Slot : "dinner",
            Title = req.Title.Trim(),
            Ingredients = string.IsNullOrWhiteSpace(req.Ingredients) ? null : req.Ingredients.Trim(),
            CreatedByUserId = user.Id,
            CreatedBy = user,
            HouseholdId = user.HouseholdId,
        };

        db.Meals.Add(meal);
        await db.SaveChangesAsync();
        return Results.Ok(Project(meal));
    }

    private static async Task<IResult> UpdateMeal(Guid id, UpdateMealRequest req, AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        var meal = await db.Meals.Include(m => m.CreatedBy).FirstOrDefaultAsync(m => m.Id == id);
        if (meal is null) return Results.NotFound();
        if (!CanAccess(user, meal)) return Results.Forbid();

        if (req.Slot is not null && Slots.Contains(req.Slot)) meal.Slot = req.Slot;
        if (req.Title is not null && !string.IsNullOrWhiteSpace(req.Title)) meal.Title = req.Title.Trim();
        if (req.Ingredients is not null) meal.Ingredients = string.IsNullOrWhiteSpace(req.Ingredients) ? null : req.Ingredients.Trim();
        meal.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Results.Ok(Project(meal));
    }

    private static async Task<IResult> DeleteMeal(Guid id, AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        var meal = await db.Meals.FirstOrDefaultAsync(m => m.Id == id);
        if (meal is null) return Results.NotFound();
        if (!CanAccess(user, meal)) return Results.Forbid();

        db.Meals.Remove(meal);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Meal removed." });
    }

    // Push a meal's ingredients onto the grocery list — the plan-to-shop step.
    private static async Task<IResult> PushToGrocery(Guid id, AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        var meal = await db.Meals.FirstOrDefaultAsync(m => m.Id == id);
        if (meal is null) return Results.NotFound();
        if (!CanAccess(user, meal)) return Results.Forbid();

        var lines = (meal.Ingredients ?? "")
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (lines.Count == 0) return Results.BadRequest(new { error = "This meal has no ingredients to add." });

        foreach (var line in lines)
        {
            db.GroceryItems.Add(new GroceryItem
            {
                Name = char.ToUpper(line[0]) + line[1..],
                Quantity = 1,
                UserId = user.Id,
                HouseholdId = user.HouseholdId,
            });
        }

        await db.SaveChangesAsync();
        return Results.Ok(new { added = lines.Count, message = $"Added {lines.Count} item(s) to the grocery list." });
    }

    private static IQueryable<Meal> Scoped(AppDbContext db, ApplicationUser user) =>
        user.HouseholdId is not null
            ? db.Meals.Where(m => m.HouseholdId == user.HouseholdId)
            : db.Meals.Where(m => m.CreatedByUserId == user.Id && m.HouseholdId == null);

    private static bool CanAccess(ApplicationUser user, Meal meal) =>
        (user.HouseholdId is not null && meal.HouseholdId == user.HouseholdId)
        || (user.HouseholdId is null && meal.CreatedByUserId == user.Id && meal.HouseholdId == null);

    private static async Task<ApplicationUser?> CurrentUser(AppDbContext db, ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return userId is null ? null : await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
    }

    private static object Project(Meal m) => new
    {
        m.Id,
        m.Date,
        m.Slot,
        m.Title,
        m.Ingredients,
        m.CreatedByUserId,
        CreatedByName = m.CreatedBy?.DisplayName,
    };
}
