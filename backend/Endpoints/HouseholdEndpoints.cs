using System.Security.Claims;
using backend.Data;
using backend.DTOs.Household;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class HouseholdEndpoints
{
    public static RouteGroupBuilder MapHouseholdEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/household").RequireAuthorization();

        group.MapPost("/", CreateHousehold);
        group.MapGet("/", GetMyHousehold);
        group.MapPost("/join", JoinHousehold);
        group.MapPost("/leave", LeaveHousehold);
        group.MapPost("/regenerate-invite", RegenerateInviteCode);
        group.MapPut("/", UpdateHousehold);
        group.MapDelete("/kick/{userId}", KickMember);

        return group;
    }

    private static async Task<IResult> CreateHousehold(
        CreateHouseholdRequest request,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();
        if (user.HouseholdId is not null)
            return Results.BadRequest(new { error = "You are already in a household." });

        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new { error = "Household name is required." });

        var household = new Household
        {
            Name = request.Name.Trim(),
            OwnerId = userId,
        };

        db.Households.Add(household);
        user.HouseholdId = household.Id;
        await db.SaveChangesAsync();

        return Results.Ok(ToResponse(household, new List<ApplicationUser> { user }));
    }

    private static async Task<IResult> GetMyHousehold(
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();
        if (user.HouseholdId is null)
            return Results.NotFound(new { error = "not_in_household" });

        var household = await db.Households
            .Include(h => h.Members)
            .FirstOrDefaultAsync(h => h.Id == user.HouseholdId);

        if (household is null)
            return Results.NotFound(new { error = "not_in_household" });

        return Results.Ok(ToResponse(household, household.Members));
    }

    private static async Task<IResult> JoinHousehold(
        JoinHouseholdRequest request,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();
        if (user.HouseholdId is not null)
            return Results.BadRequest(new { error = "You are already in a household. Leave it first." });

        var code = request.InviteCode?.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(code))
            return Results.BadRequest(new { error = "Invite code is required." });

        var household = await db.Households
            .Include(h => h.Members)
            .FirstOrDefaultAsync(h => h.InviteCode == code);

        if (household is null)
            return Results.NotFound(new { error = "Invalid invite code." });

        user.HouseholdId = household.Id;
        await db.SaveChangesAsync();

        // Reload members to include the new user
        await db.Entry(household).Collection(h => h.Members).LoadAsync();

        return Results.Ok(ToResponse(household, household.Members));
    }

    private static async Task<IResult> LeaveHousehold(
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();
        if (user.HouseholdId is null)
            return Results.BadRequest(new { error = "You are not in a household." });

        var household = await db.Households
            .Include(h => h.Members)
            .FirstOrDefaultAsync(h => h.Id == user.HouseholdId);

        if (household is null)
        {
            user.HouseholdId = null;
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Left household." });
        }

        // If owner and sole member, delete household
        if (household.OwnerId == userId && household.Members.Count <= 1)
        {
            user.HouseholdId = null;
            db.Households.Remove(household);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Household deleted (you were the last member)." });
        }

        // If owner with other members, transfer ownership
        if (household.OwnerId == userId)
        {
            var nextOwner = household.Members
                .Where(m => m.Id != userId)
                .OrderBy(m => m.CreatedAt)
                .First();
            household.OwnerId = nextOwner.Id;
        }

        user.HouseholdId = null;
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Left household." });
    }

    private static async Task<IResult> RegenerateInviteCode(
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();
        if (user.HouseholdId is null)
            return Results.BadRequest(new { error = "You are not in a household." });

        var household = await db.Households
            .Include(h => h.Members)
            .FirstOrDefaultAsync(h => h.Id == user.HouseholdId);

        if (household is null) return Results.NotFound();
        if (household.OwnerId != userId)
            return Results.Forbid();

        household.InviteCode = Household.GenerateInviteCode();
        await db.SaveChangesAsync();

        return Results.Ok(ToResponse(household, household.Members));
    }

    private static async Task<IResult> UpdateHousehold(
        UpdateHouseholdRequest request,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();
        if (user.HouseholdId is null)
            return Results.BadRequest(new { error = "You are not in a household." });

        var household = await db.Households
            .Include(h => h.Members)
            .FirstOrDefaultAsync(h => h.Id == user.HouseholdId);

        if (household is null) return Results.NotFound();
        if (household.OwnerId != userId) return Results.Forbid();

        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new { error = "Name is required." });

        household.Name = request.Name.Trim();
        if (request.SplitMode is "equal" or "proportional")
            household.SplitMode = request.SplitMode;
        await db.SaveChangesAsync();

        return Results.Ok(ToResponse(household, household.Members));
    }

    private static async Task<IResult> KickMember(
        string userId,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var callerId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var caller = await db.Users.FirstOrDefaultAsync(u => u.Id == callerId);

        if (caller is null) return Results.Unauthorized();
        if (caller.HouseholdId is null)
            return Results.BadRequest(new { error = "You are not in a household." });

        var household = await db.Households
            .Include(h => h.Members)
            .FirstOrDefaultAsync(h => h.Id == caller.HouseholdId);

        if (household is null) return Results.NotFound();
        if (household.OwnerId != callerId) return Results.Forbid();
        if (userId == callerId)
            return Results.BadRequest(new { error = "Cannot kick yourself. Use leave instead." });

        var target = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (target is null || target.HouseholdId != household.Id)
            return Results.NotFound(new { error = "User not found in your household." });

        target.HouseholdId = null;
        await db.SaveChangesAsync();

        await db.Entry(household).Collection(h => h.Members).LoadAsync();
        return Results.Ok(ToResponse(household, household.Members));
    }

    private static HouseholdResponse ToResponse(
        Household household,
        List<ApplicationUser> members)
    {
        return new HouseholdResponse(
            household.Id,
            household.Name,
            household.InviteCode,
            household.OwnerId,
            members.Select(m => new HouseholdMemberInfo(
                m.Id,
                m.DisplayName,
                m.Email ?? "",
                m.Id == household.OwnerId,
                m.Color,
                m.Income
            )).ToList(),
            household.CreatedAt,
            household.SplitMode
        );
    }
}
