using System.Security.Claims;
using backend.Data;
using backend.Models;
using backend.Services.Push;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class PushEndpoints
{
    public static RouteGroupBuilder MapPushEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/push").RequireAuthorization();
        group.MapGet("/public-key", GetPublicKey);
        group.MapPost("/subscribe", Subscribe);
        group.MapPost("/unsubscribe", Unsubscribe);
        group.MapPost("/test", SendTest);
        return group;
    }

    public record PushKeys(string P256dh, string Auth);
    public record SubscribeRequest(string Endpoint, PushKeys Keys);
    public record UnsubscribeRequest(string Endpoint);

    private static IResult GetPublicKey(VapidKeyProvider vapid) =>
        Results.Ok(new { enabled = vapid.Enabled, publicKey = vapid.PublicKey });

    private static async Task<IResult> Subscribe(SubscribeRequest req, AppDbContext db, ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Results.Unauthorized();
        if (string.IsNullOrWhiteSpace(req.Endpoint) || req.Keys is null
            || string.IsNullOrWhiteSpace(req.Keys.P256dh) || string.IsNullOrWhiteSpace(req.Keys.Auth))
            return Results.BadRequest(new { error = "Incomplete subscription." });

        // Endpoint is unique; re-subscribing (same device) just refreshes ownership/keys.
        var existing = await db.PushSubscriptions.FirstOrDefaultAsync(s => s.Endpoint == req.Endpoint);
        if (existing is not null)
        {
            existing.UserId = userId;
            existing.P256dh = req.Keys.P256dh;
            existing.Auth = req.Keys.Auth;
        }
        else
        {
            db.PushSubscriptions.Add(new PushSubscription
            {
                UserId = userId,
                Endpoint = req.Endpoint,
                P256dh = req.Keys.P256dh,
                Auth = req.Keys.Auth,
            });
        }
        await db.SaveChangesAsync();
        return Results.Ok(new { subscribed = true });
    }

    private static async Task<IResult> Unsubscribe(UnsubscribeRequest req, AppDbContext db, ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Results.Unauthorized();

        var sub = await db.PushSubscriptions.FirstOrDefaultAsync(s => s.Endpoint == req.Endpoint && s.UserId == userId);
        if (sub is not null)
        {
            db.PushSubscriptions.Remove(sub);
            await db.SaveChangesAsync();
        }
        return Results.Ok(new { subscribed = false });
    }

    private static async Task<IResult> SendTest(PushService push, ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Results.Unauthorized();
        if (!push.Enabled) return Results.Ok(new { sent = false, enabled = false });

        await push.SendToUserAsync(userId, "hdash", "Push notifications are working. ✓", "/today");
        return Results.Ok(new { sent = true, enabled = true });
    }
}
