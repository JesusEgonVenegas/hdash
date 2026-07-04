using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;

    // Personal accent color for attribution across the app.
    public string Color { get; set; } = "green";

    // Monthly income, used to weight shared expenses when the household splits
    // proportionally. Null = not shared; treated as an equal split for this member.
    public decimal? Income { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Whether this person receives the daily email digest.
    public bool DigestOptIn { get; set; } = true;

    // Preferred local hour (0-23) to receive the digest; null = use the global default.
    public int? DigestHour { get; set; }

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }
}
