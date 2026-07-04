namespace backend.DTOs.Household;

public record HouseholdResponse(
    Guid Id,
    string Name,
    string InviteCode,
    string OwnerId,
    List<HouseholdMemberInfo> Members,
    DateTime CreatedAt,
    string SplitMode = "equal"
);

public record HouseholdMemberInfo(
    string Id,
    string DisplayName,
    string Email,
    bool IsOwner,
    string Color = "green",
    decimal? Income = null
);
