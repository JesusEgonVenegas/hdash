using System.Security.Claims;
using backend.Data;
using backend.Services.Digest;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class DigestEndpoints
{
    public static RouteGroupBuilder MapDigestEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/digest").RequireAuthorization();
        group.MapGet("/preview", Preview);
        group.MapPost("/send-test", SendTest);
        group.MapGet("/settings", GetSettings);
        group.MapPut("/settings", UpdateSettings);
        return group;
    }

    public record DigestSettingsDto(bool DigestOptIn, int? DigestHour);

    private static async Task<IResult> GetSettings(
        AppDbContext db, IConfiguration config, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();
        return Results.Ok(new
        {
            digestOptIn = user.DigestOptIn,
            digestHour = user.DigestHour,                       // null = use default
            defaultHour = config.GetValue("Digest:Hour", 6),
            activeSkin = config["Digest:Skin"] ?? "departures",
            schedulerEnabled = config.GetValue("Digest:Enabled", false),
        });
    }

    private static async Task<IResult> UpdateSettings(
        AppDbContext db, DigestSettingsDto dto, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();
        if (dto.DigestHour is < 0 or > 23)
            return Results.BadRequest(new { error = "Hour must be between 0 and 23." });

        user.DigestOptIn = dto.DigestOptIn;
        user.DigestHour = dto.DigestHour;
        await db.SaveChangesAsync();
        return Results.Ok(new { digestOptIn = user.DigestOptIn, digestHour = user.DigestHour });
    }

    // Renders the caller's digest as HTML so it can be opened in a browser tab.
    private static async Task<IResult> Preview(
        AppDbContext db, DigestDispatcher dispatcher, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        var digest = await dispatcher.Service.BuildForUserAsync(user, DateTime.UtcNow.Date);
        return Results.Content(dispatcher.Preview(digest), "text/html");
    }

    // Sends the digest to the caller's own email address, right now.
    private static async Task<IResult> SendTest(
        AppDbContext db, DigestDispatcher dispatcher, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();
        if (string.IsNullOrEmpty(user.Email)) return Results.BadRequest(new { error = "Your account has no email address." });

        var digest = await dispatcher.Service.BuildForUserAsync(user, DateTime.UtcNow.Date);
        await dispatcher.SendAsync(digest, new[] { user.Email });
        return Results.Ok(new { message = $"Test digest sent to {user.Email}.", recipients = new[] { user.Email } });
    }

    private static async Task<Models.ApplicationUser?> CurrentUser(AppDbContext db, ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return userId is null ? null : await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
    }
}
