using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.DTOs.Auth;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace backend.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        group.MapGet("/me", GetCurrentUser).RequireAuthorization();
        group.MapPost("/logout", Logout).RequireAuthorization();

        return group;
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        UserManager<ApplicationUser> userManager)
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
        };

        var result = await userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            return Results.BadRequest(new
            {
                errors = result.Errors.Select(e => e.Description),
            });
        }

        return Results.Ok(new { message = "Registration successful" });
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration)
    {
        var user = await userManager.FindByEmailAsync(request.Email);

        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
            return Results.Unauthorized();

        var token = GenerateJwtToken(user, configuration);
        var expirationHours = configuration.GetValue<int>("Jwt:ExpirationHours", 24);

        return Results.Ok(new AuthResponse(
            Token: token,
            Expiration: DateTime.UtcNow.AddHours(expirationHours),
            User: new UserInfo(user.Id, user.Email!, user.DisplayName)
        ));
    }

    private static IResult GetCurrentUser(ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = principal.FindFirstValue(ClaimTypes.Email);
        var displayName = principal.FindFirstValue("DisplayName");

        if (userId is null || email is null)
            return Results.Unauthorized();

        return Results.Ok(new UserInfo(userId, email, displayName ?? ""));
    }

    private static IResult Logout()
    {
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

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim("DisplayName", user.DisplayName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

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
