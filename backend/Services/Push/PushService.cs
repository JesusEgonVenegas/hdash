using System.Net;
using System.Text.Json;
using backend.Data;
using Microsoft.EntityFrameworkCore;
using WebPush;

namespace backend.Services.Push;

/// <summary>
/// Sends Web Push notifications to a user's subscribed devices, pruning any that
/// the push service reports as gone. No-op when VAPID isn't configured.
/// </summary>
public class PushService
{
    private readonly AppDbContext _db;
    private readonly VapidKeyProvider _vapid;
    private readonly ILogger<PushService> _logger;

    public PushService(AppDbContext db, VapidKeyProvider vapid, ILogger<PushService> logger)
    {
        _db = db;
        _vapid = vapid;
        _logger = logger;
    }

    public bool Enabled => _vapid.Enabled;

    public async Task SendToUserAsync(string userId, string title, string body, string? url = null)
    {
        if (!_vapid.Enabled) return;

        var subs = await _db.PushSubscriptions.Where(s => s.UserId == userId).ToListAsync();
        if (subs.Count == 0) return;

        var payload = JsonSerializer.Serialize(new { title, body, url });
        var vapidDetails = new VapidDetails(_vapid.Subject, _vapid.PublicKey, _vapid.PrivateKey);
        var client = new WebPushClient();
        var pruned = false;

        foreach (var s in subs)
        {
            try
            {
                await client.SendNotificationAsync(
                    new WebPush.PushSubscription(s.Endpoint, s.P256dh, s.Auth), payload, vapidDetails);
            }
            catch (WebPushException ex) when (
                ex.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
            {
                _db.PushSubscriptions.Remove(s); // subscription is dead — drop it
                pruned = true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Push send failed for {Endpoint}", s.Endpoint);
            }
        }

        if (pruned) await _db.SaveChangesAsync();
    }
}
