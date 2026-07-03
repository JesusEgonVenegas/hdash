namespace backend.Models;

/// <summary>
/// A short note on the household pinboard — a message left for housemates.
/// Household-scoped (or personal when the author has no household).
/// </summary>
public class HouseholdNote
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Content { get; set; } = string.Empty;
    public bool Pinned { get; set; } = false;
    public string Color { get; set; } = "yellow"; // yellow, green, blue, pink

    public string CreatedByUserId { get; set; } = string.Empty;
    public ApplicationUser CreatedBy { get; set; } = null!;

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
