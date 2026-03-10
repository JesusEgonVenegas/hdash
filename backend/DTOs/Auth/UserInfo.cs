namespace backend.DTOs.Auth;

public record UserInfo(
    string Id,
    string Email,
    string DisplayName
);
