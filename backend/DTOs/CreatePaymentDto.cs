namespace backend.DTOs;

public class CreatePaymentDto
{
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;
}
