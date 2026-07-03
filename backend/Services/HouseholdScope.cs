using System.Security.Claims;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Resolves the current user and the set of user IDs whose data they may see.
/// Centralises the "am I in a household, and who are its members" logic that
/// every feature endpoint needs, so scoping rules live in exactly one place.
/// </summary>
public static class HouseholdScope
{
    public record Scope(ApplicationUser User, IReadOnlyList<string> MemberIds)
    {
        public bool InHousehold => User.HouseholdId is not null;

        /// <summary>True if the given owner is visible to the current user (self, or a housemate).</summary>
        public bool CanView(string ownerUserId) => MemberIds.Contains(ownerUserId);
    }

    /// <summary>
    /// Returns the scope for the authenticated principal, or null if the user
    /// record can't be found (treat as Unauthorized at the call site).
    /// </summary>
    public static async Task<Scope?> ResolveAsync(AppDbContext db, ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return null;

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return null;

        if (user.HouseholdId is null)
            return new Scope(user, new[] { user.Id });

        var memberIds = await db.Users
            .Where(u => u.HouseholdId == user.HouseholdId)
            .Select(u => u.Id)
            .ToListAsync();

        return new Scope(user, memberIds);
    }
}
