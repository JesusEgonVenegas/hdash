using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }
}
