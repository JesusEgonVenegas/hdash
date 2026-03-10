namespace backend.Models;

public class Debt
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Name { get; set; } = string.Empty;

    public decimal StartingAmount { get; set; }

    public decimal InterestRate { get; set; } // APR in percent

    public decimal MinPayment { get; set; }

    public int DueDay { get; set; } //1-31

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<Payment> Payments { get; set; } = new();

    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
}
