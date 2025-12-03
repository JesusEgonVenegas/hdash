namespace backend.DTOs;

public class CreateDebtDto
{
    public string Name { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public decimal InterestRate { get; set; }

    public decimal MinPayment { get; set; }

    public int DueDay { get; set; }
}
