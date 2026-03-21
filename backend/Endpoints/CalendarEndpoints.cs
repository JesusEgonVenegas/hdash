using System.Security.Claims;
using backend.Data;
using backend.DTOs.Calendar;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class CalendarEndpoints
{
    private static readonly string[] ValidColors = ["green", "blue", "red", "yellow", "purple"];

    public static RouteGroupBuilder MapCalendarEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/calendar").RequireAuthorization();

        group.MapGet("/", GetEvents);
        group.MapPost("/", CreateEvent);
        group.MapPut("/{id}", UpdateEvent);
        group.MapDelete("/{id}", DeleteEvent);

        return group;
    }

    // GET /api/calendar?month=2026-03
    private static async Task<IResult> GetEvents(
        AppDbContext db,
        ClaimsPrincipal principal,
        string? month = null)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FindAsync(userId);
        if (user == null) return Results.Unauthorized();

        IQueryable<CalendarEvent> query;

        if (user.HouseholdId != null)
        {
            query = db.CalendarEvents
                .Where(e => e.HouseholdId == user.HouseholdId);
        }
        else
        {
            query = db.CalendarEvents
                .Where(e => e.CreatedByUserId == userId && e.HouseholdId == null);
        }

        // Optional month filter: ?month=2026-03
        if (!string.IsNullOrEmpty(month) && DateTime.TryParse(month + "-01", out var monthStart))
        {
            var monthEnd = monthStart.AddMonths(1);
            query = query.Where(e =>
                e.StartDate < monthEnd && (e.EndDate == null || e.EndDate >= monthStart) ||
                e.StartDate >= monthStart && e.StartDate < monthEnd);
        }

        var events = await query
            .Include(e => e.CreatedBy)
            .OrderBy(e => e.StartDate)
            .Select(e => new
            {
                e.Id,
                e.Title,
                e.Description,
                e.StartDate,
                e.EndDate,
                e.IsAllDay,
                e.Color,
                e.CreatedByUserId,
                CreatedByName = e.CreatedBy.DisplayName,
                e.HouseholdId,
                e.CreatedAt,
            })
            .ToListAsync();

        return Results.Ok(events);
    }

    // POST /api/calendar
    private static async Task<IResult> CreateEvent(
        AppDbContext db,
        ClaimsPrincipal principal,
        CreateCalendarEventRequest req)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FindAsync(userId);
        if (user == null) return Results.Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Title))
            return Results.BadRequest(new { error = "Title is required" });

        var color = ValidColors.Contains(req.Color) ? req.Color : "green";

        var evt = new CalendarEvent
        {
            Title = req.Title.Trim(),
            Description = req.Description?.Trim(),
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            IsAllDay = req.IsAllDay,
            Color = color,
            CreatedByUserId = userId,
            HouseholdId = user.HouseholdId,
        };

        db.CalendarEvents.Add(evt);
        await db.SaveChangesAsync();

        return Results.Created($"/api/calendar/{evt.Id}", new
        {
            evt.Id,
            evt.Title,
            evt.Description,
            evt.StartDate,
            evt.EndDate,
            evt.IsAllDay,
            evt.Color,
            evt.CreatedByUserId,
            CreatedByName = user.DisplayName,
            evt.HouseholdId,
            evt.CreatedAt,
        });
    }

    // PUT /api/calendar/{id}
    private static async Task<IResult> UpdateEvent(
        Guid id,
        AppDbContext db,
        ClaimsPrincipal principal,
        UpdateCalendarEventRequest req)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FindAsync(userId);
        if (user == null) return Results.Unauthorized();

        var evt = await db.CalendarEvents
            .Include(e => e.CreatedBy)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (evt == null) return Results.NotFound();

        // Only creator or same household can edit
        if (evt.CreatedByUserId != userId &&
            (evt.HouseholdId == null || evt.HouseholdId != user.HouseholdId))
            return Results.Forbid();

        if (req.Title != null) evt.Title = req.Title.Trim();
        if (req.Description != null) evt.Description = req.Description.Trim();
        if (req.StartDate != null) evt.StartDate = req.StartDate.Value;
        if (req.EndDate != null) evt.EndDate = req.EndDate;
        if (req.IsAllDay != null) evt.IsAllDay = req.IsAllDay.Value;
        if (req.Color != null && ValidColors.Contains(req.Color)) evt.Color = req.Color;

        evt.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            evt.Id,
            evt.Title,
            evt.Description,
            evt.StartDate,
            evt.EndDate,
            evt.IsAllDay,
            evt.Color,
            evt.CreatedByUserId,
            CreatedByName = evt.CreatedBy.DisplayName,
            evt.HouseholdId,
            evt.CreatedAt,
        });
    }

    // DELETE /api/calendar/{id}
    private static async Task<IResult> DeleteEvent(
        Guid id,
        AppDbContext db,
        ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var user = await db.Users.FindAsync(userId);
        if (user == null) return Results.Unauthorized();

        var evt = await db.CalendarEvents.FindAsync(id);
        if (evt == null) return Results.NotFound();

        if (evt.CreatedByUserId != userId &&
            (evt.HouseholdId == null || evt.HouseholdId != user.HouseholdId))
            return Results.Forbid();

        db.CalendarEvents.Remove(evt);
        await db.SaveChangesAsync();

        return Results.NoContent();
    }
}
