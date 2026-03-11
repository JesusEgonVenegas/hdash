namespace backend.DTOs.Chore;

public record UpdateChoreRequest(
    string? Name = null,
    string? Description = null,
    string? Frequency = null,
    string? AssignedToUserId = null
);
