namespace backend.Models;

/// <summary>
/// A planned meal for a given day and slot. Ingredients (one per line) can be
/// pushed onto the grocery list in one tap — the plan-to-shop workflow.
/// </summary>
public class Meal
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime Date { get; set; }
    public string Slot { get; set; } = "dinner"; // breakfast, lunch, dinner
    public string Title { get; set; } = string.Empty;
    public string? Ingredients { get; set; } // newline-separated

    public string CreatedByUserId { get; set; } = string.Empty;
    public ApplicationUser CreatedBy { get; set; } = null!;

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
