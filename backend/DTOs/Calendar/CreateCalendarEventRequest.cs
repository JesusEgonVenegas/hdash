namespace backend.DTOs.Calendar;

public record CreateCalendarEventRequest(
    string Title,
    DateTime StartDate,
    DateTime? EndDate = null,
    string? Description = null,
    bool IsAllDay = false,
    string Color = "green"
);
