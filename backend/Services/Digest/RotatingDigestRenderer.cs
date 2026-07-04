namespace backend.Services.Digest;

/// <summary>
/// Picks a skin by the day: a lean weekday skin most mornings, the full Herald
/// broadsheet on Sundays. Implements <see cref="IDigestRenderer"/> so the rest of
/// the pipeline is unaware rotation is happening.
/// </summary>
public class RotatingDigestRenderer : IDigestRenderer
{
    private readonly IDigestRenderer _weekday;
    private readonly IDigestRenderer _sunday;

    public RotatingDigestRenderer(IDigestRenderer weekday, IDigestRenderer sunday)
    {
        _weekday = weekday;
        _sunday = sunday;
    }

    public string Name => "auto";

    private IDigestRenderer Pick(DateTime date) =>
        date.DayOfWeek == DayOfWeek.Sunday ? _sunday : _weekday;

    public string Subject(HouseholdDigest digest) => Pick(digest.Date).Subject(digest);
    public string Render(HouseholdDigest digest) => Pick(digest.Date).Render(digest);
}
