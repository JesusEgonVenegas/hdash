namespace backend.DTOs.Grocery;

public record CreateGroceryItemRequest(
    string Name,
    int Quantity = 1,
    string? Category = null
);
