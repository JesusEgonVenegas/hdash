using System.Security.Claims;
using backend.Data;
using backend.DTOs.Grocery;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class GroceryEndpoints
{
    public static RouteGroupBuilder MapGroceryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/grocery").RequireAuthorization();

        group.MapGet("/", GetGroceryItems);
        group.MapPost("/", CreateGroceryItem);
        group.MapPut("/{id}", UpdateGroceryItem);
        group.MapPut("/{id}/toggle", ToggleGroceryItem);
        group.MapDelete("/{id}", DeleteGroceryItem);
        group.MapDelete("/checked", ClearCheckedItems);

        return group;
    }

    private static async Task<IResult> GetGroceryItems(
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        IQueryable<GroceryItem> query;

        if (user.HouseholdId is not null)
        {
            query = db.GroceryItems
                .Where(g => g.HouseholdId == user.HouseholdId)
                .Include(g => g.User);
        }
        else
        {
            query = db.GroceryItems
                .Where(g => g.UserId == userId && g.HouseholdId == null);
        }

        var items = await query
            .OrderBy(g => g.IsChecked)
            .ThenByDescending(g => g.CreatedAt)
            .ToListAsync();

        return Results.Ok(items.Select(g => new
        {
            g.Id,
            g.Name,
            g.Quantity,
            g.IsChecked,
            g.Category,
            g.UserId,
            UserName = g.User?.DisplayName,
            g.CreatedAt,
            g.UpdatedAt,
        }));
    }

    private static async Task<IResult> CreateGroceryItem(
        CreateGroceryItemRequest request,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new { error = "Item name is required." });

        var item = new GroceryItem
        {
            Name = CapitalizeFirst(request.Name),
            Quantity = request.Quantity > 0 ? request.Quantity : 1,
            Category = NormalizeAisle(request.Category),
            UserId = userId,
            HouseholdId = user.HouseholdId,
        };

        db.GroceryItems.Add(item);
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            item.Id,
            item.Name,
            item.Quantity,
            item.IsChecked,
            item.Category,
            item.UserId,
            UserName = user.DisplayName,
            item.CreatedAt,
            item.UpdatedAt,
        });
    }

    private static async Task<IResult> UpdateGroceryItem(
        Guid id,
        UpdateGroceryItemRequest request,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        var item = await db.GroceryItems
            .Include(g => g.User)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (item is null) return Results.NotFound();

        if (!CanAccess(user, item)) return Results.Forbid();

        if (request.Name is not null)
            item.Name = CapitalizeFirst(request.Name);
        if (request.Quantity is not null)
            item.Quantity = request.Quantity.Value > 0 ? request.Quantity.Value : 1;
        if (request.IsChecked is not null)
            item.IsChecked = request.IsChecked.Value;
        if (request.Category is not null)
            item.Category = NormalizeAisle(request.Category);

        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            item.Id,
            item.Name,
            item.Quantity,
            item.IsChecked,
            item.Category,
            item.UserId,
            UserName = item.User?.DisplayName,
            item.CreatedAt,
            item.UpdatedAt,
        });
    }

    private static async Task<IResult> ToggleGroceryItem(
        Guid id,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        var item = await db.GroceryItems
            .Include(g => g.User)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (item is null) return Results.NotFound();

        if (!CanAccess(user, item)) return Results.Forbid();

        item.IsChecked = !item.IsChecked;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            item.Id,
            item.Name,
            item.Quantity,
            item.IsChecked,
            item.Category,
            item.UserId,
            UserName = item.User?.DisplayName,
            item.CreatedAt,
            item.UpdatedAt,
        });
    }

    private static async Task<IResult> DeleteGroceryItem(
        Guid id,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        var item = await db.GroceryItems.FindAsync(id);

        if (item is null) return Results.NotFound();

        if (!CanAccess(user, item)) return Results.Forbid();

        db.GroceryItems.Remove(item);
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Item deleted." });
    }

    private static async Task<IResult> ClearCheckedItems(
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        IQueryable<GroceryItem> query;

        if (user.HouseholdId is not null)
        {
            query = db.GroceryItems
                .Where(g => g.HouseholdId == user.HouseholdId && g.IsChecked);
        }
        else
        {
            query = db.GroceryItems
                .Where(g => g.UserId == userId && g.HouseholdId == null && g.IsChecked);
        }

        var checkedItems = await query.ToListAsync();
        db.GroceryItems.RemoveRange(checkedItems);
        await db.SaveChangesAsync();

        return Results.Ok(new { removed = checkedItems.Count });
    }

    /// <summary>
    /// Household members can access any household item.
    /// Solo users can only access their own items.
    /// </summary>
    private static bool CanAccess(ApplicationUser user, GroceryItem item)
    {
        if (user.HouseholdId is not null && item.HouseholdId == user.HouseholdId)
            return true;

        if (user.HouseholdId is null && item.UserId == user.Id && item.HouseholdId == null)
            return true;

        return false;
    }

    // "toilet paper" -> "Toilet paper" (only the first character, so brand-ish
    // names like "iPhone charger" keep their internal capitals).
    private static string CapitalizeFirst(string s)
    {
        s = s.Trim();
        return s.Length == 0 ? s : char.ToUpper(s[0]) + s[1..];
    }

    // Canonicalize an aisle so casing can't fragment groups:
    // "pantry" / "PANTRY" / "Pantry" all become "Pantry".
    private static string? NormalizeAisle(string? s)
    {
        s = s?.Trim();
        return string.IsNullOrEmpty(s) ? null : char.ToUpper(s[0]) + s[1..].ToLower();
    }
}
