namespace backend.Services.Digest;

/// <summary>
/// The fully-assembled content of one household's daily digest, independent of
/// how it's rendered. Every skin (newspaper, terminal, board, calm, …) consumes
/// this same model, so the visual style can be chosen/changed without touching
/// the data pipeline.
/// </summary>
public record HouseholdDigest(
    string HouseholdName,
    DateTime Date,
    IReadOnlyList<string> RecipientEmails,
    IReadOnlyList<DigestItem> Overdue,
    IReadOnlyList<DigestItem> Agenda,
    IReadOnlyList<DigestDebt> Debts,
    decimal TotalOwed,
    decimal MonthlyInterest,
    decimal PaidToDate,
    IReadOnlyList<DigestGrocery> Grocery)
{
    public bool HasAnything =>
        Overdue.Count > 0 || Agenda.Count > 0 || Debts.Count > 0 || Grocery.Count > 0;
}

/// <summary>A single actionable line: a chore, todo, or calendar event.</summary>
public record DigestItem(
    string Type,       // "chore" | "todo" | "event"
    string Severity,   // "overdue" | "due" | "upcoming"
    string Title,
    string Detail,
    DateTime Date);

public record DigestDebt(
    string Name,
    decimal Balance,
    decimal AprPercent,
    decimal MonthlyInterest,
    string NextDueLabel);

public record DigestGrocery(string Name, int Quantity, string? Category);
