namespace backend.DTOs.Todo;

public record UpdateTodoRequest(
    string? Title = null,
    string? Description = null,
    bool? IsCompleted = null,
    string? Priority = null,
    DateTime? DueDate = null,
    string? AssignedToUserId = null
);
