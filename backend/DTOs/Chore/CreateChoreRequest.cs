namespace backend.DTOs.Chore;

public record CreateChoreRequest(
    string Name,
    string? Description = null,
    string Frequency = "weekly",
    string? AssignedToUserId = null
);
