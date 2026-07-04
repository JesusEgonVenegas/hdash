using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Data;
using backend.DTOs.Auth;
using backend.Models;
using backend.Services.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace backend.Endpoints;

public static class AuthEndpoints
{
    // Generic reply for reset/verification requests so an attacker can't probe
    // which email addresses have accounts (no account enumeration).
    private const string GenericSentReply = "If that email has an account, a message is on its way.";

    public static readonly string[] MemberColors = ["green", "blue", "yellow", "pink", "purple", "orange", "cyan", "red"];

    public static RouteGroupBuilder MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        // Sensitive, unauthenticated endpoints are rate-limited per IP.
        group.MapPost("/register", Register).RequireRateLimiting("auth");
        group.MapPost("/login", Login).RequireRateLimiting("auth");
        group.MapGet("/me", GetCurrentUser).RequireAuthorization();
        group.MapPost("/logout", Logout).RequireAuthorization();
        group.MapPut("/profile", UpdateProfile).RequireAuthorization();
        group.MapPost("/change-password", ChangePassword).RequireAuthorization();
        group.MapPost("/resend-verification-self", ResendVerificationSelf).RequireAuthorization();
        group.MapPost("/forgot-password", ForgotPassword).RequireRateLimiting("auth");
        group.MapPost("/reset-password", ResetPassword).RequireRateLimiting("auth");
        group.MapPost("/confirm-email", ConfirmEmail).RequireRateLimiting("auth");
        group.MapPost("/resend-verification", ResendVerification).RequireRateLimiting("auth");

        return group;
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        UserManager<ApplicationUser> userManager,
        AuthMailer mailer)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return Results.BadRequest(new { errors = new[] { "Email is required." } });

        if (string.IsNullOrWhiteSpace(request.DisplayName))
            return Results.BadRequest(new { errors = new[] { "Display name is required." } });

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName,
            Color = MemberColors[(uint)request.Email.GetHashCode() % MemberColors.Length],
        };

        var result = await userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            return Results.BadRequest(new
            {
                errors = result.Errors.Select(e => e.Description),
            });
        }

        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        await mailer.SendVerificationAsync(user, token);

        return Results.Ok(new { message = "Registration successful. Check your email to confirm your address." });
    }

    private static async Task<IResult> ForgotPassword(
        ForgotPasswordRequest request,
        UserManager<ApplicationUser> userManager,
        AuthMailer mailer)
    {
        var user = await userManager.FindByEmailAsync(request.Email ?? "");
        if (user is not null)
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            await mailer.SendPasswordResetAsync(user, token);
        }
        return Results.Ok(new { message = GenericSentReply });
    }

    private static async Task<IResult> ResetPassword(
        ResetPasswordRequest request,
        UserManager<ApplicationUser> userManager)
    {
        var user = await userManager.FindByEmailAsync(request.Email ?? "");
        if (user is null)
            return Results.BadRequest(new { errors = new[] { "Invalid or expired reset link." } });

        string token;
        try { token = TokenCodec.Decode(request.Token); }
        catch { return Results.BadRequest(new { errors = new[] { "Invalid or expired reset link." } }); }

        var result = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
        return result.Succeeded
            ? Results.Ok(new { message = "Password updated. You can now sign in." })
            : Results.BadRequest(new { errors = result.Errors.Select(e => e.Description) });
    }

    private static async Task<IResult> ConfirmEmail(
        ConfirmEmailRequest request,
        UserManager<ApplicationUser> userManager)
    {
        var user = await userManager.FindByEmailAsync(request.Email ?? "");
        if (user is null)
            return Results.BadRequest(new { errors = new[] { "Invalid or expired confirmation link." } });

        if (user.EmailConfirmed)
            return Results.Ok(new { message = "Email already confirmed." });

        string token;
        try { token = TokenCodec.Decode(request.Token); }
        catch { return Results.BadRequest(new { errors = new[] { "Invalid or expired confirmation link." } }); }

        var result = await userManager.ConfirmEmailAsync(user, token);
        return result.Succeeded
            ? Results.Ok(new { message = "Email confirmed. You're all set." })
            : Results.BadRequest(new { errors = result.Errors.Select(e => e.Description) });
    }

    private static async Task<IResult> ResendVerification(
        ResendVerificationRequest request,
        UserManager<ApplicationUser> userManager,
        AuthMailer mailer)
    {
        var user = await userManager.FindByEmailAsync(request.Email ?? "");
        if (user is not null && !user.EmailConfirmed)
        {
            var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
            await mailer.SendVerificationAsync(user, token);
        }
        return Results.Ok(new { message = GenericSentReply });
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        UserManager<ApplicationUser> userManager,
        AppDbContext db,
        IConfiguration configuration)
    {
        var user = await userManager.FindByEmailAsync(request.Email);

        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
            return Results.Unauthorized();

        if (configuration.GetValue("Auth:RequireConfirmedEmail", false) && !user.EmailConfirmed)
            return Results.Json(new { error = "Please confirm your email before signing in." }, statusCode: 403);

        // Load household info for the user
        await db.Entry(user).Reference(u => u.Household).LoadAsync();

        var token = GenerateJwtToken(user, configuration);
        var expirationHours = configuration.GetValue<int>("Jwt:ExpirationHours", 24);

        return Results.Ok(new AuthResponse(
            Token: token,
            Expiration: DateTime.UtcNow.AddHours(expirationHours),
            User: new UserInfo(
                user.Id,
                user.Email!,
                user.DisplayName,
                user.HouseholdId?.ToString(),
                user.Household?.Name
            )
        ));
    }

    private static async Task<IResult> GetCurrentUser(
        ClaimsPrincipal principal,
        AppDbContext db)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Results.Unauthorized();

        var user = await db.Users
            .Include(u => u.Household)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        return Results.Ok(new UserInfo(
            user.Id,
            user.Email!,
            user.DisplayName,
            user.HouseholdId?.ToString(),
            user.Household?.Name,
            user.EmailConfirmed,
            user.Color
        ));
    }

    private static async Task<IResult> UpdateProfile(
        UpdateProfileRequest request, ClaimsPrincipal principal, UserManager<ApplicationUser> userManager)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null) return Results.Unauthorized();
        if (string.IsNullOrWhiteSpace(request.DisplayName))
            return Results.BadRequest(new { errors = new[] { "Display name is required." } });

        user.DisplayName = request.DisplayName.Trim();
        if (request.Color is not null && MemberColors.Contains(request.Color))
            user.Color = request.Color;
        // Income is optional; omit to leave unchanged, send 0 (or negative) to clear.
        if (request.Income.HasValue)
            user.Income = request.Income.Value > 0 ? request.Income.Value : null;

        var result = await userManager.UpdateAsync(user);
        return result.Succeeded
            ? Results.Ok(new { displayName = user.DisplayName, color = user.Color, income = user.Income })
            : Results.BadRequest(new { errors = result.Errors.Select(e => e.Description) });
    }

    private static async Task<IResult> ChangePassword(
        ChangePasswordRequest request, ClaimsPrincipal principal, UserManager<ApplicationUser> userManager)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null) return Results.Unauthorized();

        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        return result.Succeeded
            ? Results.Ok(new { message = "Password changed." })
            : Results.BadRequest(new { errors = result.Errors.Select(e => e.Description) });
    }

    private static async Task<IResult> ResendVerificationSelf(
        ClaimsPrincipal principal, UserManager<ApplicationUser> userManager, AuthMailer mailer)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null) return Results.Unauthorized();
        if (user.EmailConfirmed) return Results.Ok(new { message = "Email already confirmed." });

        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        await mailer.SendVerificationAsync(user, token);
        return Results.Ok(new { message = "Verification email sent." });
    }

    private static async Task<IResult> Logout(ClaimsPrincipal principal, AppDbContext db)
    {
        var jti = principal.FindFirstValue(JwtRegisteredClaimNames.Jti);
        if (jti is not null && !await db.RevokedTokens.AnyAsync(t => t.Jti == jti))
        {
            var expUnix = principal.FindFirstValue("exp");
            var expiresAt = long.TryParse(expUnix, out var secs)
                ? DateTimeOffset.FromUnixTimeSeconds(secs).UtcDateTime
                : DateTime.UtcNow.AddDays(1);

            db.RevokedTokens.Add(new RevokedToken { Jti = jti, ExpiresAtUtc = expiresAt });

            // Opportunistically purge tokens that have already expired.
            var now = DateTime.UtcNow;
            db.RevokedTokens.RemoveRange(db.RevokedTokens.Where(t => t.ExpiresAtUtc < now));

            await db.SaveChangesAsync();
        }

        return Results.Ok(new { message = "Logged out" });
    }

    private static string GenerateJwtToken(
        ApplicationUser user,
        IConfiguration configuration)
    {
        var jwtKey = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT Key not configured");
        var expirationHours = configuration.GetValue<int>("Jwt:ExpirationHours", 24);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email!),
            new("DisplayName", user.DisplayName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        if (user.HouseholdId is not null)
        {
            claims.Add(new Claim("HouseholdId", user.HouseholdId.Value.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expirationHours),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
