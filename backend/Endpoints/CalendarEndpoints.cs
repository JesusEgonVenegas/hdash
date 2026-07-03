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

        var all = await query.Include(e => e.CreatedBy).ToListAsync();

        // No month → return base events as stored (no expansion).
        if (string.IsNullOrEmpty(month) || !DateTime.TryParse(month + "-01", out var monthStart))
            return Results.Ok(all.OrderBy(e => e.StartDate).Select(e => Project(e, e.StartDate, e.EndDate)));

        var monthEnd = monthStart.AddMonths(1);
        var occurrences = new List<(DateTime Start, object Projection)>();

        foreach (var e in all)
        {
            if (e.Recurrence == "none")
            {
                var overlaps = e.StartDate < monthEnd && (e.EndDate == null || e.EndDate >= monthStart)
                    || (e.StartDate >= monthStart && e.StartDate < monthEnd);
                if (overlaps) occurrences.Add((e.StartDate, Project(e, e.StartDate, e.EndDate)));
                continue;
            }

            // Expand recurring series into occurrences within the month.
            var occ = e.StartDate;
            var guard = 0;
            while (occ < monthEnd && guard++ < 4000)
            {
                if (occ >= monthStart)
                {
                    var end = e.EndDate.HasValue ? e.EndDate.Value + (occ - e.StartDate) : (DateTime?)null;
                    occurrences.Add((occ, Project(e, occ, end)));
                }
                occ = Advance(e.Recurrence, occ);
            }
        }

        return Results.Ok(occurrences.OrderBy(o => o.Start).Select(o => o.Projection));
    }

    private static readonly string[] Recurrences = ["none", "daily", "weekly", "monthly"];

    private static string ValidRecurrence(string? r) =>
        r is not null && Recurrences.Contains(r) ? r : "none";

    private static DateTime Advance(string recurrence, DateTime from) => recurrence switch
    {
        "daily" => from.AddDays(1),
        "weekly" => from.AddDays(7),
        "monthly" => from.AddMonths(1),
        _ => from.AddDays(1),
    };

    private static object Project(CalendarEvent e, DateTime start, DateTime? end) => new
    {
        id = e.Id,
        title = e.Title,
        description = e.Description,
        startDate = start,
        endDate = end,
        isAllDay = e.IsAllDay,
        color = e.Color,
        recurrence = e.Recurrence,
        isRecurring = e.Recurrence != "none",
        createdByUserId = e.CreatedByUserId,
        createdByName = e.CreatedBy?.DisplayName,
        householdId = e.HouseholdId,
        createdAt = e.CreatedAt,
    };

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
            Recurrence = ValidRecurrence(req.Recurrence),
            CreatedByUserId = userId,
            CreatedBy = user,
            HouseholdId = user.HouseholdId,
        };

        db.CalendarEvents.Add(evt);
        await db.SaveChangesAsync();

        return Results.Created($"/api/calendar/{evt.Id}", Project(evt, evt.StartDate, evt.EndDate));
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
        if (req.Recurrence != null) evt.Recurrence = ValidRecurrence(req.Recurrence);

        evt.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(Project(evt, evt.StartDate, evt.EndDate));
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
