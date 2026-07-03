namespace backend.Models;

/// <summary>
/// A shared expense: one person paid, and the cost is split equally among a set
/// of participants. Balances and settle-up suggestions are computed from these.
/// </summary>
public class Expense
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }

    public string PaidByUserId { get; set; } = string.Empty;
    public ApplicationUser PaidBy { get; set; } = null!;

    // Comma-separated user IDs sharing the cost (includes the payer if they share it).
    public string ParticipantIds { get; set; } = string.Empty;

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public IReadOnlyList<string> Participants() =>
        ParticipantIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
