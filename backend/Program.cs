using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using backend.Data;
using backend.DTOs;
using backend.Endpoints;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// OpenAPI
builder.Services.AddOpenApi();

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// ASP.NET Identity
builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 6;
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key is not configured. Set Jwt__Key environment variable or add Jwt:Key to appsettings.");

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = "Bearer";
        options.DefaultChallengeScheme = "Bearer";
    })
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)),
        };

        // Reject tokens whose jti has been revoked (server-side logout).
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var jti = context.Principal?.FindFirstValue(
                    System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti);
                if (jti is null) return;

                var db = context.HttpContext.RequestServices
                    .GetRequiredService<backend.Data.AppDbContext>();
                if (await db.RevokedTokens.AnyAsync(t => t.Jti == jti))
                    context.Fail("Token has been revoked.");
            },
        };
    });

builder.Services.AddAuthorization();

// Rate limiting — throttle sensitive auth endpoints per client IP to blunt
// brute-force and credential-stuffing. Applied via .RequireRateLimiting("auth").
var authPermitPerMinute = builder.Configuration.GetValue("Auth:RateLimit:PermitPerMinute", 10);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = authPermitPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));
});

// Daily email digest pipeline (data -> render -> send -> schedule).
builder.Services.AddScoped<backend.Services.Digest.DigestService>();
builder.Services.AddScoped<backend.Services.Digest.DigestDispatcher>();
// Active digest skin — swap via Digest:Skin without touching the pipeline.
builder.Services.AddSingleton<backend.Services.Digest.IDigestRenderer>(_ =>
    (builder.Configuration["Digest:Skin"] ?? "departures").ToLowerInvariant() switch
    {
        "baseline" => new backend.Services.Digest.BaselineDigestRenderer(),
        _ => new backend.Services.Digest.DeparturesDigestRenderer(),
    });
if (string.Equals(builder.Configuration["Email:Provider"], "smtp", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddSingleton<backend.Services.Email.IEmailSender, backend.Services.Email.SmtpEmailSender>();
else
    builder.Services.AddSingleton<backend.Services.Email.IEmailSender, backend.Services.Email.FileEmailSender>();
builder.Services.AddHostedService<backend.Services.Digest.DigestScheduler>();
builder.Services.AddScoped<backend.Services.Email.AuthMailer>();
builder.Services.AddHostedService<backend.Services.BackupService>();
builder.Services.AddSingleton<backend.Services.Push.VapidKeyProvider>();
builder.Services.AddScoped<backend.Services.Push.PushService>();

// CORS — reads allowed origins from config (comma-separated)
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Apply migrations on startup in every environment so a fresh deploy is ready.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    // The lived-in demo household is development-only.
    if (app.Environment.IsDevelopment())
    {
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        await DemoSeeder.SeedAsync(db, userManager, app.Logger);
    }
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Endpoints
app.MapAuthEndpoints();
app.MapHouseholdEndpoints();
app.MapDebtEndpoints();
app.MapSimulationEndpoints();
app.MapPaymentEndpoints();
app.MapGroceryEndpoints();
app.MapTodoEndpoints();
app.MapChoreEndpoints();
app.MapCalendarEndpoints();
app.MapTodayEndpoints();
app.MapDigestEndpoints();
app.MapNoteEndpoints();
app.MapExpenseEndpoints();
app.MapMealEndpoints();
app.MapFairnessEndpoints();
app.MapPushEndpoints();

app.Run();
