using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=app.db"));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// endpoints
app.MapGet("/api/debts", async (AppDbContext db) =>
{
    return await db.Debts.ToListAsync();
});

app.MapPost("/api/debts", async (AppDbContext db, Debt debt) =>
{
    debt.Id = Guid.NewGuid();
    debt.CreatedAt = DateTime.UtcNow;
    debt.UpdatedAt = DateTime.UtcNow;

    db.Debts.Add(debt);
    await db.SaveChangesAsync();

    return Results.Created($"/api/debts/{debt.Id}", debt);
});

app.Run();
