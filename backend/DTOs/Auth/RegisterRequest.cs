namespace backend.DTOs.Auth;

public record RegisterRequest(
    string Email,
    string Password,
    string DisplayName
);
