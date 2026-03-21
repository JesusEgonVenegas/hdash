namespace backend.DTOs.Auth;

public record AuthResponse(
    string Token,
    DateTime Expiration,
    UserInfo User
);
