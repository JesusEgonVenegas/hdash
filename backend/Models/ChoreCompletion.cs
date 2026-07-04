namespace backend.Models;

/// <summary>
/// A log entry written every time a chore is completed, crediting the person who
/// actually did it. Chores auto-rotate and don't keep history on the item itself,
/// so this is the source of truth for chore-load fairness over time.
/// </summary>
public class ChoreCompletion
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // The chore may later be deleted; keep a name snapshot so history survives.
    public Guid ChoreItemId { get; set; }
    public string ChoreName { get; set; } = string.Empty;

    // Who did it.
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;

    public Guid? HouseholdId { get; set; }
    public Household? Household { get; set; }

    public bool OnTime { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}
