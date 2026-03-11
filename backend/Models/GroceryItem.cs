namespace backend.Models;

public class GroceryItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public bool IsChecked { get; set; } = false;
    public string? Category { get; set; }

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
