using System.Net;
using System.Net.Mail;

namespace backend.Services.Email;

/// <summary>
/// Production sender over plain SMTP (works with Gmail app passwords, Fastmail,
/// Resend/Postmark SMTP bridges, a self-hosted relay, etc.). Configured entirely
/// from the Email:Smtp:* section so no provider SDK is needed.
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var smtp = _config.GetSection("Email:Smtp");
        var host = smtp["Host"] ?? throw new InvalidOperationException("Email:Smtp:Host not configured.");
        var port = smtp.GetValue("Port", 587);
        var fromAddress = smtp["From"] ?? throw new InvalidOperationException("Email:Smtp:From not configured.");
        var fromName = smtp["FromName"] ?? "HDASH";

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = smtp.GetValue("EnableSsl", true),
            DeliveryMethod = SmtpDeliveryMethod.Network,
        };

        var user = smtp["Username"];
        if (!string.IsNullOrEmpty(user))
            client.Credentials = new NetworkCredential(user, smtp["Password"]);

        using var mail = new MailMessage
        {
            From = new MailAddress(fromAddress, fromName),
            Subject = message.Subject,
            Body = message.HtmlBody,
            IsBodyHtml = true,
        };
        foreach (var to in message.To)
            mail.To.Add(to);

        if (mail.To.Count == 0)
        {
            _logger.LogWarning("Skipping digest send: no recipients.");
            return;
        }

        await client.SendMailAsync(mail, ct);
        _logger.LogInformation("Digest emailed to {Recipients}", string.Join(", ", message.To));
    }
}
