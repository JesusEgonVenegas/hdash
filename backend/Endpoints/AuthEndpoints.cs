using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Data;
using backend.DTOs.Auth;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
        AppDbContext db,
        IConfiguration configuration)
    {
        var user = await userManager.FindByEmailAsync(request.Email);

        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
            return Results.Unauthorized();

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
            user.Household?.Name
        ));
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
