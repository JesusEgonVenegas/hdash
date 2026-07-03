namespace backend.Services.Digest;

/// <summary>
/// Turns a <see cref="HouseholdDigest"/> into an email. Implementations are the
/// "skins" — swap the registered renderer to change the whole look without
/// touching data assembly, scheduling, or delivery.
/// </summary>
public interface IDigestRenderer
{
    /// <summary>Short identifier for the skin, e.g. "baseline", "newspaper".</summary>
    string Name { get; }

    string Subject(HouseholdDigest digest);

    /// <summary>A complete, self-contained HTML email document.</summary>
    string Render(HouseholdDigest digest);
}
