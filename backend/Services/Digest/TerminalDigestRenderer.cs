using System.Net;
using System.Text;

namespace backend.Services.Digest;

/// <summary>
/// The "Morning Build" skin: the household's day as a CI/terminal status report,
/// green-on-black with [FAIL]/[WARN]/[ ok ] flags. Overdue items fail the build.
/// Email-safe — table layout, inline styles, bgcolor for dark cells.
/// </summary>
public class TerminalDigestRenderer : IDigestRenderer
{
    public string Name => "terminal";

    private const string Bg = "#05070a";
    private const string Panel = "#0d1117";
    private const string Bar = "#161b22";
    private const string Green = "#3fb950";
    private const string Amber = "#d29922";
    private const string Red = "#f85149";
    private const string White = "#e6edf3";
    private const string Muted = "#7d8590";
    private const string Line = "#21262d";
    private const string Mono = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

    public string Subject(HouseholdDigest d) =>
        d.Overdue.Count > 0
            ? $"● BUILD FAILING · {d.HouseholdName} · {d.Overdue.Count} overdue"
            : $"● build passing · {d.HouseholdName}";

    public string Render(HouseholdDigest d)
    {
        var failing = d.Overdue.Count > 0;
        var sb = new StringBuilder();

        sb.Append($@"<!DOCTYPE html>
<html lang=""en""><head><meta charset=""utf-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1"">
<title>{Enc(d.HouseholdName)} · build</title></head>
<body style=""margin:0;padding:0;background:{Bg};"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" bgcolor=""{Bg}"" style=""background:{Bg};"">
<tr><td align=""center"" style=""padding:24px 10px;"">
<table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" bgcolor=""{Panel}"" style=""width:600px;max-width:100%;background:{Panel};border:1px solid {Line};border-radius:8px;overflow:hidden;"">");

        // Terminal title bar
        sb.Append($@"
<tr><td bgcolor=""{Bar}"" style=""background:{Bar};padding:10px 14px;border-bottom:1px solid {Line};"">
<table role=""presentation"" width=""100%""><tr>
<td style=""font-family:{Mono};font-size:12px;color:{Muted};"">
<span style=""color:{Red};"">●</span> <span style=""color:{Amber};"">●</span> <span style=""color:{Green};"">●</span>
&nbsp;&nbsp;hdash@{Enc(Slug(d.HouseholdName))}: ~/digest</td>
<td align=""right"" style=""font-family:{Mono};font-size:11px;color:{Muted};"">{Enc(d.Date.ToString("yyyy-MM-dd ddd"))}</td>
</tr></table></td></tr>");

        // Command + build status
        sb.Append($@"
<tr><td style=""padding:16px 16px 6px;font-family:{Mono};font-size:13px;color:{White};"">
<span style=""color:{Green};"">$</span> hdash digest <span style=""color:{Muted};"">--today</span></td></tr>
<tr><td style=""padding:2px 16px 14px;"">
<span style=""font-family:{Mono};font-size:13px;font-weight:bold;color:{(failing ? Red : Green)};"">
● {(failing ? $"BUILD FAILING — {d.Overdue.Count} task(s) overdue" : "BUILD PASSING — all clear")}</span></td></tr>");

        // Task log
        sb.Append($@"<tr><td style=""padding:0 16px 8px;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">");
        var any = false;
        foreach (var i in d.Overdue) { sb.Append(LogRow(i)); any = true; }
        foreach (var i in d.Agenda) { sb.Append(LogRow(i)); any = true; }
        if (!any)
            sb.Append($@"<tr><td style=""font-family:{Mono};font-size:12px;color:{Muted};padding:8px 0;"">
<span style=""color:{Green};"">[ ok ]</span> nothing scheduled — working tree clean</td></tr>");
        sb.Append("</table></td></tr>");

        // Ledger
        if (d.Debts.Count > 0 || d.TotalOwed > 0)
        {
            var rows = new StringBuilder();
            foreach (var debt in d.Debts)
                rows.Append($@"<tr>
<td style=""font-family:{Mono};font-size:12px;color:{White};padding:3px 0;"">{Enc(debt.Name)}</td>
<td align=""right"" style=""font-family:{Mono};font-size:12px;color:{Amber};padding:3px 0;"">{Money(debt.Balance)}</td>
<td align=""right"" style=""font-family:{Mono};font-size:11px;color:{Muted};padding:3px 0 3px 12px;"">{debt.AprPercent:0.#}% APR</td></tr>");
            rows.Append($@"<tr><td colspan=""3"" style=""border-top:1px solid {Line};padding-top:6px;font-family:{Mono};font-size:11px;color:{Muted};"">
total owed <span style=""color:{Amber};font-weight:bold;"">{Money(d.TotalOwed)}</span> · interest/mo <span style=""color:{Red};"">{Money(d.MonthlyInterest)}</span></td></tr>");
            sb.Append(Cmd("ledger --balances", rows.ToString()));
        }

        // Settle-up
        if (d.Settlements.Count > 0)
        {
            var rows = new StringBuilder();
            foreach (var s in d.Settlements)
                rows.Append($@"<tr><td style=""font-family:{Mono};font-size:12px;padding:3px 0;"">
<span style=""color:{Red};"">{Enc(s.From)}</span><span style=""color:{Muted};""> -&gt; </span><span style=""color:{Green};"">{Enc(s.To)}</span></td>
<td align=""right"" style=""font-family:{Mono};font-size:12px;color:{Amber};padding:3px 0;"">{Money(s.Amount)}</td></tr>");
            sb.Append(Cmd("settle --status", rows.ToString()));
        }

        // Meals
        if (d.Meals.Count > 0)
        {
            var rows = new StringBuilder();
            foreach (var m in d.Meals)
                rows.Append($@"<tr><td style=""font-family:{Mono};font-size:11px;color:{Muted};padding:3px 0;width:46px;"">{Enc(m.Day.ToUpperInvariant())}</td>
<td style=""font-family:{Mono};font-size:12px;color:{White};padding:3px 0;"">{Enc(m.Title)}</td></tr>");
            sb.Append(Cmd("menu --week", rows.ToString()));
        }

        // Notes
        if (d.Notes.Count > 0)
        {
            var rows = new StringBuilder();
            foreach (var n in d.Notes)
                rows.Append($@"<tr><td style=""font-family:{Mono};font-size:12px;color:{White};padding:3px 0;"">
<span style=""color:{Muted};""># </span>{Enc(n.Content)} <span style=""color:{Muted};font-size:10px;"">— {Enc(n.Author)}</span></td></tr>");
            sb.Append(Cmd("notes --pinned", rows.ToString()));
        }

        // Grocery count
        if (d.Grocery.Count > 0)
            sb.Append($@"<tr><td style=""padding:10px 16px 4px;font-family:{Mono};font-size:12px;color:{White};"">
<span style=""color:{Green};"">$</span> groceries <span style=""color:{Muted};"">--pending</span> &nbsp;<span style=""color:{Amber};"">{d.Grocery.Count}</span> <span style=""color:{Muted};"">item(s) on the list</span></td></tr>");

        // Exit line + footer
        sb.Append($@"
<tr><td style=""padding:14px 16px 6px;font-family:{Mono};font-size:12px;color:{Muted};border-top:1px solid {Line};"">
<span style=""color:{Green};"">$</span> exit <span style=""color:{(failing ? Red : Green)};"">{(failing ? "1" : "0")}</span></td></tr>
<tr><td bgcolor=""{Bar}"" style=""background:{Bar};padding:10px 16px 14px;font-family:{Mono};font-size:10px;color:{Muted};text-align:center;border-top:1px solid {Line};"">
compiled by hdash · <a href=""#"" style=""color:{Green};text-decoration:none;"">dashboard</a> · <a href=""#"" style=""color:{Green};text-decoration:none;"">settings</a></td></tr>");

        sb.Append("</table></td></tr></table></body></html>");
        return sb.ToString();
    }

    private string Cmd(string command, string rowsHtml) => $@"
<tr><td style=""padding:12px 16px 4px;font-family:{Mono};font-size:13px;color:{White};"">
<span style=""color:{Green};"">$</span> {Enc(command.Split(' ')[0])} <span style=""color:{Muted};"">{Enc(command.Contains(' ') ? command[(command.IndexOf(' ') + 1)..] : "")}</span></td></tr>
<tr><td style=""padding:2px 16px 6px;""><table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">{rowsHtml}</table></td></tr>";

    private string LogRow(DigestItem item)
    {
        var (flag, color) = item.Severity switch
        {
            "overdue" => ("[FAIL]", Red),
            "due" => ("[WARN]", Amber),
            _ => ("[ ok ]", Green),
        };
        var when = item.Severity == "overdue" ? "OVERDUE"
            : item.Type == "event" && item.Detail.Contains(':') ? item.Detail
            : item.Date.ToString("ddd").ToUpperInvariant();

        return $@"<tr><td style=""font-family:{Mono};font-size:12px;padding:4px 0;"">
<span style=""color:{color};font-weight:bold;"">{flag}</span>
<span style=""color:{Muted};"">{Enc(when)}</span>
<span style=""color:{White};"">&nbsp;{Enc(item.Title)}</span>
<span style=""color:{Muted};""> — {Enc(item.Detail)}</span></td></tr>";
    }

    private static string Slug(string s)
    {
        var chars = s.ToLowerInvariant().Where(c => char.IsLetterOrDigit(c)).ToArray();
        return chars.Length == 0 ? "nest" : new string(chars);
    }

    private static string Money(decimal v) => "$" + v.ToString("#,##0.00");
    private static string Enc(string s) => WebUtility.HtmlEncode(s);
}
