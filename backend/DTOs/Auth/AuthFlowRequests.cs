namespace backend.DTOs.Auth;

public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Email, string Token, string NewPassword);
public record ConfirmEmailRequest(string Email, string Token);
public record ResendVerificationRequest(string Email);
