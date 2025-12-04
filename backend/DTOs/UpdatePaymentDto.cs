namespace backend.DTOs;

public class UpdatePaymentDto
{
    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; }
}
