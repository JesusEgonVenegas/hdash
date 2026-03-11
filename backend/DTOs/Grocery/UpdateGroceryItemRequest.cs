namespace backend.DTOs.Grocery;

public record UpdateGroceryItemRequest(
    string? Name = null,
    int? Quantity = null,
    bool? IsChecked = null,
    string? Category = null
);
