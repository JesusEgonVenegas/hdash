using System.Net;
using System.Text;
using backend.Models;
using Microsoft.AspNetCore.WebUtilities;

namespace backend.Services.Email;

/// <summary>
/// Transactional auth emails (verify address, reset password) sent through the
/// same <see cref="IEmailSender"/> as the digest — so in dev they land in the
/// file outbox, and in prod they go over SMTP with no code change.
/// </summary>
public class AuthMailer
{
    private readonly IEmailSender _sender;
    private readonly IConfiguration _config;

    public AuthMailer(IEmailSender sender, IConfiguration config)
    {
        _sender = sender;
        _config = config;
    }

    private string FrontendUrl => (_config["App:FrontendUrl"] ?? "http://localhost:3000").TrimEnd('/');

    public Task SendVerificationAsync(ApplicationUser user, string token, CancellationToken ct = default)
    {
        var link = $"{FrontendUrl}/verify-email?email={Enc(user.Email!)}&token={Enc(TokenCodec.Encode(token))}";
        var html = Template(
            "Confirm your email",
            $"Welcome to HDASH, {WebUtility.HtmlEncode(user.DisplayName)}. Confirm this address to finish setting up your account.",
            link, "Confirm email");
        return _sender.SendAsync(new EmailMessage(new[] { user.Email! }, "Confirm your HDASH email", html), ct);
    }

    public Task SendPasswordResetAsync(ApplicationUser user, string token, CancellationToken ct = default)
    {
        var link = $"{FrontendUrl}/reset-password?email={Enc(user.Email!)}&token={Enc(TokenCodec.Encode(token))}";
        var html = Template(
            "Reset your password",
            "We received a request to reset your HDASH password. This link expires shortly. If it wasn't you, ignore this email.",
            link, "Reset password");
        return _sender.SendAsync(new EmailMessage(new[] { user.Email! }, "Reset your HDASH password", html), ct);
    }

    private static string Enc(string s) => WebUtility.UrlEncode(s);

    private static string Template(string heading, string body, string link, string cta) => $@"<!DOCTYPE html>
<html lang=""en""><head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width,initial-scale=1""></head>
<body style=""margin:0;padding:0;background:#0b0e0a;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" bgcolor=""#0b0e0a""><tr><td align=""center"" style=""padding:32px 12px;"">
<table role=""presentation"" width=""480"" cellpadding=""0"" cellspacing=""0"" bgcolor=""#12160f"" style=""width:480px;max-width:100%;background:#12160f;border:1px solid #26301f;border-radius:10px;"">
<tr><td style=""padding:26px 28px;"">
<div style=""font-family:'SFMono-Regular',Consolas,monospace;font-size:15px;letter-spacing:4px;color:#5ed67c;font-weight:bold;"">HDASH</div>
<h1 style=""font-family:Georgia,serif;font-size:22px;color:#e8efe4;margin:16px 0 8px;"">{WebUtility.HtmlEncode(heading)}</h1>
<p style=""font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#a9c3a0;margin:0 0 22px;"">{WebUtility.HtmlEncode(body)}</p>
<a href=""{link}"" style=""display:inline-block;font-family:Arial,sans-serif;font-size:14px;color:#0b0e0a;background:#5ed67c;text-decoration:none;padding:11px 22px;border-radius:6px;font-weight:bold;"">{WebUtility.HtmlEncode(cta)}</a>
<p style=""font-family:Arial,sans-serif;font-size:12px;color:#5f6d55;margin:22px 0 0;word-break:break-all;"">Or paste this link:<br>{link}</p>
</td></tr></table></td></tr></table></body></html>";
}

/// <summary>URL-safe encoding for Identity tokens (which contain +, /, = otherwise).</summary>
public static class TokenCodec
{
    public static string Encode(string token) => WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
    public static string Decode(string encoded) => Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(encoded));
}
