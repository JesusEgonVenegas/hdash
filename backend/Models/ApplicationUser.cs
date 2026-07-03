using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Whether this person receives the daily email digest.
    public bool DigestOptIn { get; set; } = true;

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }
}
