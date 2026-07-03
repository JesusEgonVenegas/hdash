using System.Text;
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
    });

builder.Services.AddAuthorization();

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

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    // Seed a lived-in demo household for local development.
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    await DemoSeeder.SeedAsync(db, userManager, app.Logger);
}

app.UseCors();
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

app.Run();
