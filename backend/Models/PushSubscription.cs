namespace backend.Models;

/// <summary>
/// A browser Web Push subscription for a user. One user may have several (phone,
/// laptop, …). Dead endpoints are pruned when a send returns 404/410.
/// </summary>
public class PushSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;

    // The push service endpoint URL (unique per device/browser).
    public string Endpoint { get; set; } = string.Empty;

    // Keys from the browser PushSubscription, needed to encrypt the payload.
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
