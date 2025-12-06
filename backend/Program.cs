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
            policy.WithOrigins("http://localhost:3000").AllowAnyHeader().AllowAnyMethod();
        }
    );
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(policyName);

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

app.MapDelete(
    "/api/debts/{id}",
    async (AppDbContext db, Guid id) =>
    {
        var debt = await db.Debts.FindAsync(id);

        if (debt is null)
            return Results.NotFound();

        db.Debts.Remove(debt);
        await db.SaveChangesAsync();

        return Results.NoContent();
    }
);

app.MapPost(
    "/api/debts/{debtId}/payments",
    async (AppDbContext db, Guid debtId, CreatePaymentDto dto) =>
    {
        var debt = await db.Debts.FindAsync(debtId);
        if (debt is null)
            return Results.NotFound("Debt not found.");

        if (dto.Amount <= 0)
            return Results.BadRequest("Amount must be positive.");

        if (dto.Amount > debt.Amount)
        {
            return Results.BadRequest("Payment cannot be greater than current balance.");
        }

        var payment = new Payment
        {
            Amount = dto.Amount,
            PaidAt = dto.PaidAt,
            DebtId = debtId,
        };

        db.Payments.Add(payment);

        debt.Amount -= dto.Amount;
        if (debt.Amount < 0)
            debt.Amount = 0; // safety clamp

        debt.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Results.Ok(
            new
            {
                id = payment.Id,
                amount = payment.Amount,
                paidAt = payment.PaidAt,
                debtId = payment.DebtId,
            }
        );
    }
);

app.MapGet(
    "/api/debts/{debtId}/payments",
    async (AppDbContext db, Guid debtId) =>
    {
        var debtExists = await db.Debts.AnyAsync(d => d.Id == debtId);
        if (!debtExists)
            return Results.NotFound("Debt not found.");

        var payments = await db
            .Payments.Where(p => p.DebtId == debtId)
            .OrderByDescending(p => p.PaidAt)
            .ToListAsync();

        return Results.Ok(payments);
    }
);

app.MapGet(
    "/api/payments/{paymentId}",
    async (AppDbContext db, Guid paymentId) =>
    {
        Console.WriteLine(paymentId);
        var payment = await db.Payments.FindAsync(paymentId);

        return payment is not null ? Results.Ok(payment) : Results.NotFound();
    }
);

app.MapDelete(
    "/api/payments/{id}",
    async (AppDbContext db, Guid id) =>
    {
        var payment = await db.Payments.FindAsync(id);
        if (payment is null)
            return Results.NotFound();

        var debt = await db.Debts.FindAsync(payment.DebtId);
        if (debt is not null)
        {
            debt.Amount += payment.Amount;
            debt.UpdatedAt = DateTime.UtcNow;
        }

        db.Payments.Remove(payment);
        await db.SaveChangesAsync();

        return Results.NoContent();
    }
);

app.MapPut(
    "/api/payments/{id}",
    async (AppDbContext db, Guid id, UpdatePaymentDto dto) =>
    {
        var payment = await db.Payments.FindAsync(id);
        if (payment is null)
            return Results.NotFound();

        if (dto.Amount <= 0)
            return Results.BadRequest("Amount must be positive.");

        var debt = await db.Debts.FindAsync(payment.DebtId);

        if (debt is not null)
        {
            var oldAmount = payment.Amount;
            var newAmount = dto.Amount;
            var delta = newAmount - oldAmount;

            debt.Amount -= delta;

            if (debt.Amount < 0)
                debt.Amount = 0;

            debt.UpdatedAt = DateTime.UtcNow;
        }

        payment.Amount = dto.Amount;
        payment.PaidAt = dto.PaidAt;

        await db.SaveChangesAsync();

        return Results.Ok(
            new
            {
                id = payment.Id,
                amount = payment.Amount,
                paidAt = payment.PaidAt,
                debtId = payment.DebtId,
            }
        );
    }
);

app.MapGet(
    "/api/simulation",
    async (AppDbContext db) =>
    {
        var debts = await db.Debts.Include(d => d.Payments).OrderBy(d => d.CreatedAt).ToListAsync();

        var result = debts.Select(d => new
        {
            id = d.Id,
            name = d.Name,
            amount = d.Amount,
            interestRate = d.InterestRate,
            minPayment = d.MinPayment,
            dueDay = d.DueDay,
            payments = d
                .Payments.OrderBy(p => p.PaidAt)
                .Select(p => new
                {
                    id = p.Id,
                    amount = p.Amount,
                    paidAt = p.PaidAt,
                })
                .ToList(),
        });

        return Results.Ok(result);
    }
);

app.MapGet(
    "/api/payments",
    async (AppDbContext db, int? limit) =>
    {
        var query = db.Payments.Include(p => p.Debt).OrderByDescending(p => p.PaidAt).AsQueryable();

        if (limit.HasValue)
            query = query.Take(limit.Value);

        var payments = await query
            .Select(p => new
            {
                p.Id,
                p.Amount,
                p.PaidAt,
                Debt = new { p.Debt.Id, p.Debt.Name },
            })
            .ToListAsync();

        return Results.Ok(payments);
    }
);

app.Run();
