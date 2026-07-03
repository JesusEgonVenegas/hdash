namespace backend.DTOs.Todo;

public record CreateTodoRequest(
    string Title,
    string? Description = null,
    string Priority = "medium",
    DateTime? DueDate = null,
    string? AssignedToUserId = null,
    string Recurrence = "none"
);
