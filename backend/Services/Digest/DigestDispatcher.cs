using backend.Models;
using backend.Services.Email;

namespace backend.Services.Digest;

/// <summary>
/// Composes the pipeline: assemble → render (current skin) → send. Shared by the
/// scheduler and the preview/test endpoints so there's one path to a real email.
/// </summary>
public class DigestDispatcher
{
    private readonly DigestService _service;
    private readonly IDigestRenderer _renderer;
    private readonly IEmailSender _sender;
    private readonly ILogger<DigestDispatcher> _logger;

    public DigestDispatcher(DigestService service, IDigestRenderer renderer,
        IEmailSender sender, ILogger<DigestDispatcher> logger)
    {
        _service = service;
        _renderer = renderer;
        _sender = sender;
        _logger = logger;
    }

    public DigestService Service => _service;

    /// <summary>Render-only, for previews. No email sent.</summary>
    public string Preview(HouseholdDigest digest) => _renderer.Render(digest);

    /// <summary>Sends a digest to explicit recipients (used by the "send me a test" button).</summary>
    public async Task SendAsync(HouseholdDigest digest, IReadOnlyList<string> recipients, CancellationToken ct = default)
    {
        if (recipients.Count == 0)
        {
            _logger.LogWarning("Digest for {Name} has no recipients; not sent.", digest.HouseholdName);
            return;
        }

        await _sender.SendAsync(new EmailMessage(recipients, _renderer.Subject(digest), _renderer.Render(digest)), ct);
    }

    /// <summary>Builds and sends a household's digest to all its members.</summary>
    public async Task SendForHouseholdAsync(Household household, DateTime today, bool skipEmpty, CancellationToken ct = default)
    {
        var digest = await _service.BuildForHouseholdAsync(household, today);
        if (skipEmpty && !digest.HasAnything)
        {
            _logger.LogInformation("Digest for {Name} skipped (nothing to report).", digest.HouseholdName);
            return;
        }
        await SendAsync(digest, digest.RecipientEmails, ct);
    }
}
