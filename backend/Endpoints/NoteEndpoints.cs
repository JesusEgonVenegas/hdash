using System.Security.Claims;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class NoteEndpoints
{
    private static readonly string[] ValidColors = ["yellow", "green", "blue", "pink"];

    public static RouteGroupBuilder MapNoteEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/notes").RequireAuthorization();
        group.MapGet("/", GetNotes);
        group.MapPost("/", CreateNote);
        group.MapPut("/{id}", UpdateNote);
        group.MapDelete("/{id}", DeleteNote);
        return group;
    }

    public record CreateNoteRequest(string Content, string Color = "yellow");
    public record UpdateNoteRequest(string? Content = null, string? Color = null, bool? Pinned = null);

    private static async Task<IResult> GetNotes(AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        var notes = await Scoped(db, user)
            .Include(n => n.CreatedBy)
            .OrderByDescending(n => n.Pinned)
            .ThenByDescending(n => n.UpdatedAt)
            .Select(n => Project(n))
            .ToListAsync();

        return Results.Ok(notes);
    }

    private static async Task<IResult> CreateNote(CreateNoteRequest req, AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();
        if (string.IsNullOrWhiteSpace(req.Content))
            return Results.BadRequest(new { error = "A note needs some text." });

        var note = new HouseholdNote
        {
            Content = req.Content.Trim(),
            Color = ValidColors.Contains(req.Color) ? req.Color : "yellow",
            CreatedByUserId = user.Id,
            CreatedBy = user,
            HouseholdId = user.HouseholdId,
        };

        db.HouseholdNotes.Add(note);
        await db.SaveChangesAsync();
        return Results.Ok(Project(note));
    }

    private static async Task<IResult> UpdateNote(Guid id, UpdateNoteRequest req, AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        var note = await db.HouseholdNotes.Include(n => n.CreatedBy).FirstOrDefaultAsync(n => n.Id == id);
        if (note is null) return Results.NotFound();
        if (!CanAccess(user, note)) return Results.Forbid();

        if (req.Content is not null && !string.IsNullOrWhiteSpace(req.Content)) note.Content = req.Content.Trim();
        if (req.Color is not null && ValidColors.Contains(req.Color)) note.Color = req.Color;
        if (req.Pinned is not null) note.Pinned = req.Pinned.Value;
        note.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Results.Ok(Project(note));
    }

    private static async Task<IResult> DeleteNote(Guid id, AppDbContext db, ClaimsPrincipal principal)
    {
        var user = await CurrentUser(db, principal);
        if (user is null) return Results.Unauthorized();

        var note = await db.HouseholdNotes.FirstOrDefaultAsync(n => n.Id == id);
        if (note is null) return Results.NotFound();
        if (!CanAccess(user, note)) return Results.Forbid();

        db.HouseholdNotes.Remove(note);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Note removed." });
    }

    private static IQueryable<HouseholdNote> Scoped(AppDbContext db, ApplicationUser user) =>
        user.HouseholdId is not null
            ? db.HouseholdNotes.Where(n => n.HouseholdId == user.HouseholdId)
            : db.HouseholdNotes.Where(n => n.CreatedByUserId == user.Id && n.HouseholdId == null);

    private static bool CanAccess(ApplicationUser user, HouseholdNote note) =>
        (user.HouseholdId is not null && note.HouseholdId == user.HouseholdId)
        || (user.HouseholdId is null && note.CreatedByUserId == user.Id && note.HouseholdId == null);

    private static async Task<ApplicationUser?> CurrentUser(AppDbContext db, ClaimsPrincipal principal)
    {
        var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return userId is null ? null : await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
    }

    private static object Project(HouseholdNote n) => new
    {
        n.Id,
        n.Content,
        n.Pinned,
        n.Color,
        n.CreatedByUserId,
        CreatedByName = n.CreatedBy?.DisplayName,
        CreatedByColor = n.CreatedBy?.Color,
        n.CreatedAt,
        n.UpdatedAt,
    };
}
