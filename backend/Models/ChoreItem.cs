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

    // Who actually ticked it off last — the chore rotates away immediately, so
    // without this the UI can't confirm whose click just landed.
    public string? LastCompletedByUserId { get; set; }
    public ApplicationUser? LastCompletedBy { get; set; }

    // Consecutive on-time completions.
    public int Streak { get; set; } = 0;

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Whether the last completion still covers this chore. A completion settles
    /// the cycle running up to <see cref="NextDueDate"/>; once that date arrives
    /// the next cycle has begun and the chore is due again — so the stored
    /// <see cref="IsCompletedThisCycle"/> flag is only meaningful together with
    /// the clock. A method, not a property, so EF never tries to map it.
    /// </summary>
    public bool IsDoneForNow(DateTime today) =>
        IsCompletedThisCycle && today.Date < NextDueDate.Date;
}
