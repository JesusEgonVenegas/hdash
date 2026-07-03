namespace backend.Models;

public class TodoItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsCompleted { get; set; } = false;
    public string Priority { get; set; } = "medium"; // low, medium, high
    public DateTime? DueDate { get; set; }

    // none, daily, weekly, monthly — when completed, the next occurrence is created.
    public string Recurrence { get; set; } = "none";

    public string CreatedByUserId { get; set; } = string.Empty;
    public ApplicationUser CreatedBy { get; set; } = null!;

    public string? AssignedToUserId { get; set; }
    public ApplicationUser? AssignedTo { get; set; }

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
