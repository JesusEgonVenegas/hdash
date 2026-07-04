using System.Net;
using System.Text;

namespace backend.Services.Digest;

/// <summary>
/// The "06:00 Departures" skin: the household's day as a split-flap transit board.
/// Email-safe — table layout, inline styles, bgcolor attributes for dark cells so
/// it survives Outlook/Gmail. Overdue items read as DELAYED.
/// </summary>
public class DeparturesDigestRenderer : IDigestRenderer
{
    public string Name => "departures";

    private const string Board = "#101216";
    private const string Header = "#0b0d10";
    private const string Amber = "#ffb400";
    private const string White = "#eef1f5";
    private const string Muted = "#7b8291";
    private const string Green = "#35d07f";
    private const string Red = "#ff5b52";
    private const string LineC = "#23272e";
    private const string Mono = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";

    public string Subject(HouseholdDigest d)
    {
        if (d.Overdue.Count > 0) return $"🚉 {d.HouseholdName} · {d.Overdue.Count} delayed";
        return $"🚉 {d.HouseholdName} · {d.Agenda.Count} departures today";
    }

    public string Render(HouseholdDigest d)
    {
        var sb = new StringBuilder();
        sb.Append($@"<!DOCTYPE html>
<html lang=""en""><head><meta charset=""utf-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1"">
<title>{Enc(d.HouseholdName)} Departures</title></head>
<body style=""margin:0;padding:0;background:#05070a;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" bgcolor=""#05070a"" style=""background:#05070a;"">
<tr><td align=""center"" style=""padding:24px 10px;"">
<table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" bgcolor=""{Board}"" style=""width:600px;max-width:100%;background:{Board};border-radius:10px;overflow:hidden;"">");

        // Header
        sb.Append($@"
<tr><td bgcolor=""{Header}"" style=""background:{Header};padding:16px 20px;border-bottom:2px solid {LineC};"">
<table role=""presentation"" width=""100%""><tr>
<td style=""font-family:{Mono};font-size:16px;letter-spacing:4px;color:{Amber};font-weight:bold;"">{Enc(d.HouseholdName.ToUpperInvariant())}</td>
<td align=""right"" style=""font-family:{Mono};font-size:11px;letter-spacing:2px;color:{Muted};"">{Enc(d.Date.ToString("ddd dd MMM").ToUpperInvariant())}</td>
</tr></table></td></tr>");

        // Board rows
        sb.Append($@"
<tr><td style=""padding:6px 12px 10px;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
<tr>
<th align=""left"" style=""font-family:{Mono};font-size:9px;letter-spacing:2px;color:{Muted};padding:8px;border-bottom:1px solid {LineC};font-weight:normal;"">TIME</th>
<th align=""left"" style=""font-family:{Mono};font-size:9px;letter-spacing:2px;color:{Muted};padding:8px;border-bottom:1px solid {LineC};font-weight:normal;"">DEPARTURE</th>
<th align=""right"" style=""font-family:{Mono};font-size:9px;letter-spacing:2px;color:{Muted};padding:8px;border-bottom:1px solid {LineC};font-weight:normal;"">STATUS</th>
</tr>");

        var any = false;
        foreach (var item in d.Overdue) { sb.Append(BoardRow(item)); any = true; }
        foreach (var item in d.Agenda) { sb.Append(BoardRow(item)); any = true; }
        if (!any)
            sb.Append($@"<tr><td colspan=""3"" style=""font-family:{Mono};font-size:13px;color:{Muted};padding:20px 8px;text-align:center;"">NO DEPARTURES SCHEDULED — SERVICE CLEAR</td></tr>");

        sb.Append("</table></td></tr>");

        // Settle-up tabs
        if (d.Settlements.Count > 0)
        {
            var tabs = new StringBuilder();
            foreach (var s in d.Settlements)
                tabs.Append($@"
<tr><td style=""padding:7px 8px;border-bottom:1px solid #191c21;"">
<span style=""font-family:{Mono};font-size:12px;color:{Red};"">{Enc(s.From.ToUpperInvariant())}</span>
<span style=""font-family:{Mono};font-size:11px;color:{Muted};""> owes </span>
<span style=""font-family:{Mono};font-size:12px;color:{Green};"">{Enc(s.To.ToUpperInvariant())}</span></td>
<td align=""right"" style=""padding:7px 8px;border-bottom:1px solid #191c21;font-family:{Mono};font-size:12px;color:{Amber};"">{Money(s.Amount)}</td></tr>");
            sb.Append(Section("TABS", tabs.ToString()));
        }

        // On the menu (meals this week)
        if (d.Meals.Count > 0)
        {
            var menu = new StringBuilder();
            foreach (var m in d.Meals)
                menu.Append($@"
<tr><td style=""padding:6px 8px;border-bottom:1px solid #191c21;width:48px;font-family:{Mono};font-size:11px;color:{Muted};"">{Enc(m.Day.ToUpperInvariant())}</td>
<td style=""padding:6px 8px;border-bottom:1px solid #191c21;font-family:{Mono};font-size:12px;color:{White};"">{Enc(m.Title)}</td></tr>");
            sb.Append(Section("ON THE MENU", menu.ToString()));
        }

        // Bulletins (pinboard notes)
        if (d.Notes.Count > 0)
        {
            var notes = new StringBuilder();
            foreach (var n in d.Notes)
                notes.Append($@"
<tr><td style=""padding:7px 8px;border-bottom:1px solid #191c21;"">
<span style=""font-family:{Mono};font-size:12px;color:{White};"">{Enc(n.Content)}</span>
<span style=""font-family:{Mono};font-size:10px;letter-spacing:1px;color:{Muted};""> — {Enc(n.Author.ToUpperInvariant())}</span>
</td></tr>");
            sb.Append($@"
<tr><td style=""padding:2px 12px 10px;"">
<div style=""font-family:{Mono};font-size:9px;letter-spacing:2px;color:{Muted};padding:8px;border-bottom:1px solid {LineC};"">BULLETINS</div>
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">{notes}</table>
</td></tr>");
        }

        // Footer strip: ledger + grocery summary
        var nextFare = d.Debts.Count > 0 ? d.Debts[0].NextDueLabel : "—";
        sb.Append($@"
<tr><td bgcolor=""{Header}"" style=""background:{Header};padding:14px 20px;border-top:2px solid {LineC};"">
<table role=""presentation"" width=""100%""><tr>
<td style=""font-family:{Mono};font-size:11px;letter-spacing:1px;color:{Muted};"">OWED <span style=""color:{Amber};font-weight:bold;"">{Money(d.TotalOwed)}</span></td>
<td align=""center"" style=""font-family:{Mono};font-size:11px;letter-spacing:1px;color:{Muted};"">NEXT FARE <span style=""color:{Amber};font-weight:bold;"">{Enc(nextFare)}</span></td>
<td align=""right"" style=""font-family:{Mono};font-size:11px;letter-spacing:1px;color:{Muted};"">PROVISIONS <span style=""color:{Amber};font-weight:bold;"">{d.Grocery.Count}</span></td>
</tr></table></td></tr>");

        // Colophon
        sb.Append($@"
<tr><td style=""padding:12px 20px 16px;font-family:{Mono};font-size:10px;letter-spacing:1px;color:{Muted};text-align:center;"">
COMPILED BY HDASH · <a href=""#"" style=""color:{Green};text-decoration:none;"">DASHBOARD</a> · <a href=""#"" style=""color:{Green};text-decoration:none;"">SETTINGS</a>
</td></tr>");

        sb.Append("</table></td></tr></table></body></html>");
        return sb.ToString();
    }

    private string Section(string label, string rowsHtml) => $@"
<tr><td style=""padding:2px 12px 10px;"">
<div style=""font-family:{Mono};font-size:9px;letter-spacing:2px;color:{Muted};padding:8px;border-bottom:1px solid {LineC};"">{label}</div>
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">{rowsHtml}</table>
</td></tr>";

    private string BoardRow(DigestItem item)
    {
        var overdue = item.Severity == "overdue";
        var time = overdue ? "--:--"
            : item.Type == "event" && item.Detail.Contains(':') ? item.Detail
            : item.Date.ToString("ddd").ToUpperInvariant();

        var (statusText, statusColor) = item.Severity switch
        {
            "overdue" => ("DELAYED", Red),
            "due" => ("NOW", Amber),
            _ => ("SCHEDULED", Muted),
        };

        return $@"
<tr>
<td style=""font-family:{Mono};font-size:13px;color:{Amber};padding:9px 8px;border-bottom:1px solid #191c21;white-space:nowrap;"">{Enc(time)}</td>
<td style=""padding:9px 8px;border-bottom:1px solid #191c21;"">
<span style=""font-family:{Mono};font-size:13px;letter-spacing:1px;color:{White};text-transform:uppercase;"">{Enc(item.Title)}</span>
<div style=""font-family:{Mono};font-size:10px;letter-spacing:1px;color:{Muted};padding-top:2px;"">{Enc(item.Detail.ToUpperInvariant())}</div>
</td>
<td align=""right"" style=""font-family:{Mono};font-size:10px;letter-spacing:1px;color:{statusColor};padding:9px 8px;border-bottom:1px solid #191c21;white-space:nowrap;font-weight:bold;"">{statusText}</td>
</tr>";
    }

    private static string Money(decimal v) => "$" + v.ToString("#,##0.00");
    private static string Enc(string s) => WebUtility.HtmlEncode(s);
}
