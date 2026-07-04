namespace backend.Services.Digest;

/// <summary>
/// Maps a skin name to a renderer. One place so the DI registration and the
/// preview <c>?skin=</c> override agree on what's available.
/// </summary>
public static class DigestSkins
{
    /// <summary>Selectable skins (excludes "auto", which is a rotation of these).</summary>
    public static readonly string[] Names = { "departures", "terminal", "herald", "baseline" };

    public static IDigestRenderer Create(string? name, IConfiguration config)
    {
        switch ((name ?? "departures").Trim().ToLowerInvariant())
        {
            case "baseline": return new BaselineDigestRenderer();
            case "terminal": return new TerminalDigestRenderer();
            case "herald": return new HeraldDigestRenderer();
            case "auto":
            case "rotation":
                // Sunday = the full Herald broadsheet; other days = a lean skin.
                var weekdayName = (config["Digest:WeekdaySkin"] ?? "departures").Trim().ToLowerInvariant();
                if (weekdayName is "auto" or "rotation") weekdayName = "departures"; // no recursion
                return new RotatingDigestRenderer(Create(weekdayName, config), new HeraldDigestRenderer());
            default: return new DeparturesDigestRenderer();
        }
    }
}
