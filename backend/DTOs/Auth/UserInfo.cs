namespace backend.DTOs.Auth;

public record UserInfo(
    string Id,
    string Email,
    string DisplayName,
    string? HouseholdId = null,
    string? HouseholdName = null,
    bool EmailConfirmed = false,
    string Color = "green"
);

public record UpdateProfileRequest(string DisplayName, string? Color = null, decimal? Income = null);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
