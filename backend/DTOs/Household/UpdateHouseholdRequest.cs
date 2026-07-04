namespace backend.DTOs.Household;

public record UpdateHouseholdRequest(string Name, string? SplitMode = null);
