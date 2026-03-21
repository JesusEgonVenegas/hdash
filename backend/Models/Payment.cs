namespace backend.Models;

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;

    // relationship

    public Guid DebtId { get; set; }
    public Debt Debt { get; set; } = null!;
}
