using System.Security.Claims;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class DebtEndpoints
{
    public static RouteGroupBuilder MapDebtEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/debts").RequireAuthorization();

        group.MapGet("/", GetDebts);
        group.MapPost("/", CreateDebt);
        group.MapGet("/{id}", GetDebt);
        group.MapPut("/{id}", UpdateDebt);
        group.MapDelete("/{id}", DeleteDebt);
        group.MapPost("/{debtId}/payments", CreatePayment);
        group.MapGet("/{debtId}/payments", GetDebtPayments);

        return group;
    }

    public static RouteGroupBuilder MapSimulationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/simulation").RequireAuthorization();

        group.MapGet("/", GetSimulationData);

        return group;
    }

    private static async Task<IResult> GetDebts(
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.Unauthorized();

        IQueryable<Debt> query;

        if (user.HouseholdId is not null)
        {
            var memberIds = await db.Users
                .Where(u => u.HouseholdId == user.HouseholdId)
                .Select(u => u.Id)
                .ToListAsync();

            query = db.Debts
                .Where(d => memberIds.Contains(d.UserId))
                .Include(d => d.User);
        }
        else
        {
            query = db.Debts.Where(d => d.UserId == userId);
        }

        var debts = await query.OrderBy(d => d.CreatedAt).ToListAsync();

        return Results.Ok(
            debts.Select(d => new
            {
                d.Id,
                d.Name,
                d.StartingAmount,
                d.InterestRate,
                d.MinPayment,
                d.DueDay,
                d.CreatedAt,
                d.UpdatedAt,
                d.UserId,
                UserName = d.User?.DisplayName,
            })
        );
    }

    private static async Task<IResult> CreateDebt(
        AppDbContext db,
        CreateDebtDto dto,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;

        if (dto.Name.Length < 1)
            return Results.BadRequest("Name is required.");
        if (dto.StartingAmount <= 0)
            return Results.BadRequest("Amount must be positive.");
        if (dto.MinPayment <= 0)
            return Results.BadRequest("Minimum payment must be positive.");
        if (dto.DueDay < 1 || dto.DueDay > 31)
            return Results.BadRequest("DueDay must be between 1 and 31.");

        var debt = new Debt
        {
            Name = dto.Name,
            StartingAmount = dto.StartingAmount,
            InterestRate = dto.InterestRate,
            MinPayment = dto.MinPayment,
            DueDay = dto.DueDay,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.Debts.Add(debt);
        await db.SaveChangesAsync();

        return Results.Created($"/api/debts/{debt.Id}", debt);
    }

    private static async Task<IResult> GetDebt(
        AppDbContext db,
        Guid id,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var debt = await db.Debts.FindAsync(id);

        if (debt is null) return Results.NotFound();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Results.Unauthorized();

        if (user.HouseholdId is not null)
        {
            var debtOwner = await db.Users.FirstOrDefaultAsync(u => u.Id == debt.UserId);
            if (debtOwner?.HouseholdId != user.HouseholdId)
                return Results.Forbid();
        }
        else if (debt.UserId != userId)
        {
            return Results.Forbid();
        }

        return Results.Ok(debt);
    }

    private static async Task<IResult> UpdateDebt(
        AppDbContext db,
        Guid id,
        UpdateDebtDto dto,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var debt = await db.Debts.FindAsync(id);

        if (debt is null) return Results.NotFound();
        if (debt.UserId != userId) return Results.Forbid();

        if (dto.Name.Length < 1)
            return Results.BadRequest("Name is required.");
        if (dto.StartingAmount <= 0)
            return Results.BadRequest("Amount must be positive.");
        if (dto.MinPayment <= 0)
            return Results.BadRequest("Minimum payment must be positive.");
        if (dto.DueDay < 1 || dto.DueDay > 31)
            return Results.BadRequest("Dueday must be between 1 and 31.");

        debt.Name = dto.Name;
        debt.StartingAmount = dto.StartingAmount;
        debt.InterestRate = dto.InterestRate;
        debt.MinPayment = dto.MinPayment;
        debt.DueDay = dto.DueDay;
        debt.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Results.Ok(debt);
    }

    private static async Task<IResult> DeleteDebt(
        AppDbContext db,
        Guid id,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var debt = await db.Debts.FindAsync(id);

        if (debt is null) return Results.NotFound();
        if (debt.UserId != userId) return Results.Forbid();

        db.Debts.Remove(debt);
        await db.SaveChangesAsync();

        return Results.NoContent();
    }

    private static async Task<IResult> CreatePayment(
        AppDbContext db,
        Guid debtId,
        CreatePaymentDto dto,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var debt = await db.Debts.FindAsync(debtId);

        if (debt is null) return Results.NotFound("Debt not found.");
        if (debt.UserId != userId) return Results.Forbid();
        if (dto.Amount <= 0) return Results.BadRequest("Amount must be positive.");

        var payment = new Payment
        {
            Amount = dto.Amount,
            PaidAt = dto.PaidAt,
            DebtId = debtId,
        };

        db.Payments.Add(payment);
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            id = payment.Id,
            amount = payment.Amount,
            paidAt = payment.PaidAt,
            debtId = payment.DebtId,
        });
    }

    private static async Task<IResult> GetDebtPayments(
        AppDbContext db,
        Guid debtId,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Results.Unauthorized();

        var debt = await db.Debts.FirstOrDefaultAsync(d => d.Id == debtId);
        if (debt is null) return Results.NotFound("Debt not found.");

        // Allow household members to view each other's debt payments
        if (user.HouseholdId is not null)
        {
            var debtOwner = await db.Users.FirstOrDefaultAsync(u => u.Id == debt.UserId);
            if (debtOwner?.HouseholdId != user.HouseholdId)
                return Results.Forbid();
        }
        else if (debt.UserId != userId)
        {
            return Results.Forbid();
        }

        var payments = await db.Payments
            .Where(p => p.DebtId == debtId)
            .OrderByDescending(p => p.PaidAt)
            .ToListAsync();

        return Results.Ok(payments);
    }

    private static async Task<IResult> GetSimulationData(
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Results.Unauthorized();

        IQueryable<Debt> query;

        if (user.HouseholdId is not null)
        {
            var memberIds = await db.Users
                .Where(u => u.HouseholdId == user.HouseholdId)
                .Select(u => u.Id)
                .ToListAsync();

            query = db.Debts.Where(d => memberIds.Contains(d.UserId));
        }
        else
        {
            query = db.Debts.Where(d => d.UserId == userId);
        }

        var debts = await query
            .Include(d => d.Payments)
            .OrderBy(d => d.CreatedAt)
            .ToListAsync();

        var result = debts.Select(d => new
        {
            id = d.Id,
            name = d.Name,
            startingAmount = d.StartingAmount,
            interestRate = d.InterestRate,
            minPayment = d.MinPayment,
            dueDay = d.DueDay,
            userId = d.UserId,
            payments = d.Payments
                .OrderBy(p => p.PaidAt)
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
}
