namespace backend.DTOs.Calendar;

public record UpdateCalendarEventRequest(
    string? Title = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    string? Description = null,
    bool? IsAllDay = null,
    string? Color = null,
    string? Recurrence = null
);
