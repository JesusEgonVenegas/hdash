namespace backend.Services.Email;

public record EmailMessage(IReadOnlyList<string> To, string Subject, string HtmlBody);

public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}
