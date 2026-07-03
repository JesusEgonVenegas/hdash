namespace backend.DTOs.Auth;

public record UserInfo(
    string Id,
    string Email,
    string DisplayName,
    string? HouseholdId = null,
    string? HouseholdName = null,
    bool EmailConfirmed = false
);

public record UpdateProfileRequest(string DisplayName);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
