using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

var policyName = "AllowLocalhost";

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=app.db"));

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        name: policyName,
        policy =>
        {
            policy.WithOrigins("http//localhost:3000").AllowAnyHeader().AllowAnyMethod();
        }
    );
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// endpoints
app.MapGet(
    "/api/debts",
    async (AppDbContext db) =>
    {
        var debts = await db.Debts.OrderBy(d => d.CreatedAt).ToListAsync();

        return Results.Ok(debts);
    }
);

app.MapPost(
    "/api/debts",
    async (AppDbContext db, CreateDebtDto dto) =>
    {
        if (dto.Name.Length < 1)
            return Results.BadRequest("Name is required.");

        if (dto.Amount <= 0)
            return Results.BadRequest("Amount must be positive.");

        if (dto.MinPayment <= 0)
            return Results.BadRequest("Minimum payment must be positive.");

        if (dto.DueDay < 1 || dto.DueDay > 31)
            return Results.BadRequest("DueDay must be between 1 and 31.");

        var debt = new Debt
        {
            Name = dto.Name,
            Amount = dto.Amount,
            InterestRate = dto.InterestRate,
            MinPayment = dto.MinPayment,
            DueDay = dto.DueDay,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.Debts.Add(debt);
        await db.SaveChangesAsync();

        return Results.Created($"/api/debts/{debt.Id}", debt);
    }
);

app.MapGet(
    "/api/debts/{id}",
    async (AppDbContext db, Guid id) =>
    {
        var debt = await db.Debts.FindAsync(id);

        return debt is not null ? Results.Ok(debt) : Results.NotFound();
    }
);

app.MapPut(
    "/api/debts/{id}",
    async (AppDbContext db, Guid id, UpdateDebtDto dto) =>
    {
        var debt = await db.Debts.FindAsync(id);

        if (debt is null)
            return Results.NotFound();

        if (dto.Name.Length < 1)
            return Results.BadRequest("Name is required.");

        if (dto.Amount <= 0)
            return Results.BadRequest("Amount must be positive.");

        if (dto.MinPayment <= 0)
            return Results.BadRequest("Minimum payment must be positive.");

        if (dto.DueDay < 1 || dto.DueDay > 31)
            return Results.BadRequest("Dueday must be between 1 and 31.");

        debt.Name = dto.Name;
        debt.Amount = dto.Amount;
        debt.InterestRate = dto.InterestRate;
        debt.MinPayment = dto.MinPayment;
        debt.DueDay = dto.DueDay;
        debt.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Results.Ok(debt);
    }
);

app.UseCors();
app.Run();
