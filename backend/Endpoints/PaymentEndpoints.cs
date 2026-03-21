using System.Security.Claims;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class PaymentEndpoints
{
    public static RouteGroupBuilder MapPaymentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/payments").RequireAuthorization();

        group.MapGet("/", GetAllPayments);
        group.MapGet("/{paymentId}", GetPayment);
        group.MapPut("/{id}", UpdatePayment);
        group.MapDelete("/{id}", DeletePayment);

        return group;
    }

    private static async Task<IResult> GetAllPayments(
        AppDbContext db,
        ClaimsPrincipal principal,
        int? limit)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Results.Unauthorized();

        IQueryable<Payment> query;

        if (user.HouseholdId is not null)
        {
            var memberIds = await db.Users
                .Where(u => u.HouseholdId == user.HouseholdId)
                .Select(u => u.Id)
                .ToListAsync();

            query = db.Payments
                .Include(p => p.Debt)
                .Where(p => memberIds.Contains(p.Debt.UserId))
                .OrderByDescending(p => p.PaidAt);
        }
        else
        {
            query = db.Payments
                .Include(p => p.Debt)
                .Where(p => p.Debt.UserId == userId)
                .OrderByDescending(p => p.PaidAt);
        }

        if (limit.HasValue)
            query = query.Take(limit.Value);

        var payments = await query
            .Select(p => new
            {
                p.Id,
                p.Amount,
                p.PaidAt,
                Debt = new { p.Debt.Id, p.Debt.Name },
                OriginalAmount = p.Debt.StartingAmount,
                MinPayment = p.Debt.MinPayment,
                InterestRate = p.Debt.InterestRate,
            })
            .ToListAsync();

        return Results.Ok(payments);
    }

    private static async Task<IResult> GetPayment(
        AppDbContext db,
        Guid paymentId,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var payment = await db.Payments.Include(p => p.Debt).FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment is null) return Results.NotFound();
        if (payment.Debt.UserId != userId) return Results.Forbid();

        return Results.Ok(payment);
    }

    private static async Task<IResult> UpdatePayment(
        AppDbContext db,
        Guid id,
        UpdatePaymentDto dto,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var payment = await db.Payments.Include(p => p.Debt).FirstOrDefaultAsync(p => p.Id == id);

        if (payment is null) return Results.NotFound();
        if (payment.Debt.UserId != userId) return Results.Forbid();
        if (dto.Amount <= 0) return Results.BadRequest("Amount must be positive.");

        payment.Amount = dto.Amount;
        payment.PaidAt = dto.PaidAt;

        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            id = payment.Id,
            amount = payment.Amount,
            paidAt = payment.PaidAt,
            debtId = payment.DebtId,
        });
    }

    private static async Task<IResult> DeletePayment(
        AppDbContext db,
        Guid id,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var payment = await db.Payments.Include(p => p.Debt).FirstOrDefaultAsync(p => p.Id == id);

        if (payment is null) return Results.NotFound();
        if (payment.Debt.UserId != userId) return Results.Forbid();

        db.Payments.Remove(payment);
        await db.SaveChangesAsync();

        return Results.NoContent();
    }
}
