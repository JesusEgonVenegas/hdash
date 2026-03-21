namespace backend.Models;

public class ChoreItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Frequency { get; set; } = "weekly"; // daily, weekly, biweekly, monthly

    public string CreatedByUserId { get; set; } = string.Empty;
    public ApplicationUser CreatedBy { get; set; } = null!;

    public string AssignedToUserId { get; set; } = string.Empty;
    public ApplicationUser AssignedTo { get; set; } = null!;

    public bool IsCompletedThisCycle { get; set; } = false;
    public DateTime NextDueDate { get; set; }
    public DateTime? LastCompletedAt { get; set; }

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
