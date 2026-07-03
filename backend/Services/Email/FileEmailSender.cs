using System.Text;

namespace backend.Services.Email;

/// <summary>
/// Development sender: instead of talking to a mail server, it writes each email
/// as an .html file to a local outbox folder. Lets the whole digest pipeline run
/// end-to-end with zero credentials — open the file in a browser to see exactly
/// what would have landed in the inbox.
/// </summary>
public class FileEmailSender : IEmailSender
{
    private readonly string _outbox;
    private readonly ILogger<FileEmailSender> _logger;

    public FileEmailSender(IConfiguration config, ILogger<FileEmailSender> logger)
    {
        _outbox = config["Email:Outbox"] ?? Path.Combine(AppContext.BaseDirectory, "outbox");
        _logger = logger;
        Directory.CreateDirectory(_outbox);
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var stamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");
        var slug = Sanitize(message.Subject);
        var file = Path.Combine(_outbox, $"{stamp}-{slug}.html");

        // Prepend the envelope as an HTML comment so the recipient list is inspectable.
        var contents = new StringBuilder()
            .AppendLine($"<!-- To: {string.Join(", ", message.To)} -->")
            .AppendLine($"<!-- Subject: {message.Subject} -->")
            .Append(message.HtmlBody)
            .ToString();

        await File.WriteAllTextAsync(file, contents, ct);
        _logger.LogInformation("Digest written to outbox: {File} (to {Recipients})",
            file, string.Join(", ", message.To));
    }

    private static string Sanitize(string s)
    {
        var cleaned = new string(s.Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray());
        return cleaned.Trim('-').ToLowerInvariant() is { Length: > 0 } v ? v[..Math.Min(v.Length, 40)] : "email";
    }
}
