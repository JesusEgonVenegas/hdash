namespace backend.Models;

/// <summary>
/// A JWT that has been explicitly revoked (via logout). Keyed by the token's
/// unique id (jti). Kept until the token would have expired anyway, then purged.
/// </summary>
public class RevokedToken
{
    public string Jti { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime RevokedAtUtc { get; set; } = DateTime.UtcNow;
}
