namespace backend.Models;

/// <summary>
/// A template that spawns a real <see cref="Expense"/> on a cadence (rent,
/// internet, …). Instances are materialized when the list is next viewed.
/// </summary>
public class RecurringExpense
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaidByUserId { get; set; } = string.Empty;
    public ApplicationUser PaidBy { get; set; } = null!;
    public string ParticipantIds { get; set; } = string.Empty;
    public string Cadence { get; set; } = "monthly"; // weekly, monthly

    public DateTime NextRunDate { get; set; }

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
