using System.Net;
using System.Text;

namespace backend.Services.Digest;

/// <summary>
/// "The Nest Herald" skin: the household's day as a newspaper broadsheet — masthead,
/// a front-page lead (the most pressing item), and the finances as a market report.
/// Light, serif, print-feeling. Best as a Sunday edition. Email-safe (tables, inline
/// CSS); the drop-cap and hairline rules degrade gracefully in Outlook.
/// </summary>
public class HeraldDigestRenderer : IDigestRenderer
{
    public string Name => "herald";

    private const string Paper = "#f4f1ea";
    private const string Page = "#fbf9f4";
    private const string Ink = "#1b1a17";
    private const string Accent = "#8a2b2b";
    private const string Muted = "#6b6862";
    private const string Rule = "#cfc8b8";
    private const string Serif = "Georgia, 'Times New Roman', Times, serif";

    public string Subject(HouseholdDigest d)
    {
        var lead = d.Overdue.Count > 0 ? d.Overdue[0] : (d.Agenda.Count > 0 ? d.Agenda[0] : null);
        return lead is not null
            ? $"📰 {Masthead(d.HouseholdName)} — {lead.Title}"
            : $"📰 {Masthead(d.HouseholdName)} — {d.Date:ddd d MMM}";
    }

    // "The Nest" -> "The Nest Herald"; "Casa Smith" -> "The Casa Smith Herald".
    private static string Masthead(string name) =>
        name.TrimStart().StartsWith("The ", StringComparison.OrdinalIgnoreCase)
            ? $"{name} Herald"
            : $"The {name} Herald";

    public string Render(HouseholdDigest d)
    {
        var sb = new StringBuilder();
        sb.Append($@"<!DOCTYPE html>
<html lang=""en""><head><meta charset=""utf-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1"">
<title>{Enc(Masthead(d.HouseholdName))}</title></head>
<body style=""margin:0;padding:0;background:{Paper};"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" bgcolor=""{Paper}"" style=""background:{Paper};"">
<tr><td align=""center"" style=""padding:24px 10px;"">
<table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" bgcolor=""{Page}"" style=""width:600px;max-width:100%;background:{Page};border:1px solid {Rule};"">");

        // Masthead
        sb.Append($@"
<tr><td style=""padding:20px 24px 6px;border-bottom:1px solid {Ink};"">
<div style=""font-family:{Serif};font-size:12px;letter-spacing:3px;color:{Muted};text-align:center;text-transform:uppercase;"">Daily Edition · Compiled by hdash</div>
<div style=""font-family:{Serif};font-size:34px;line-height:1.05;color:{Ink};text-align:center;font-weight:bold;letter-spacing:1px;padding:6px 0 4px;"">{Enc(Masthead(d.HouseholdName))}</div>
</td></tr>
<tr><td style=""padding:6px 24px;border-bottom:3px double {Ink};"">
<table role=""presentation"" width=""100%""><tr>
<td style=""font-family:{Serif};font-size:11px;color:{Muted};text-transform:uppercase;letter-spacing:1px;"">Vol. MMXXVI</td>
<td align=""center"" style=""font-family:{Serif};font-size:11px;color:{Ink};text-transform:uppercase;letter-spacing:1px;"">{Enc(d.Date.ToString("dddd, d MMMM yyyy"))}</td>
<td align=""right"" style=""font-family:{Serif};font-size:11px;color:{Muted};text-transform:uppercase;letter-spacing:1px;"">Price: Free</td>
</tr></table></td></tr>");

        // Lead story
        var lead = d.Overdue.Count > 0 ? d.Overdue[0] : (d.Agenda.Count > 0 ? d.Agenda[0] : null);
        string kicker, headline, deck;
        if (lead is null)
        {
            kicker = "HOME FRONT";
            headline = "All Quiet on the Home Front";
            deck = "No pressing business before the household today.";
        }
        else
        {
            kicker = lead.Severity == "overdue" ? "OVERDUE — ACTION REQUIRED"
                : lead.Type == "event" ? "ON THE CALENDAR TODAY" : "TODAY'S HEADLINE";
            headline = lead.Title;
            deck = lead.Detail;
        }

        var body = BuildLede(d);
        var drop = body.Length > 0 ? body[0].ToString() : "T";
        var rest = body.Length > 1 ? body[1..] : "he household carries on.";

        sb.Append($@"
<tr><td style=""padding:18px 24px 8px;"">
<div style=""font-family:{Serif};font-size:11px;letter-spacing:2px;color:{Accent};text-transform:uppercase;font-weight:bold;"">{Enc(kicker)}</div>
<div style=""font-family:{Serif};font-size:28px;line-height:1.15;color:{Ink};font-weight:bold;padding:4px 0 6px;"">{Enc(headline)}</div>
<div style=""font-family:{Serif};font-size:14px;font-style:italic;color:{Muted};padding-bottom:10px;border-bottom:1px solid {Rule};"">{Enc(deck)}</div>
<div style=""font-family:{Serif};font-size:14px;line-height:1.55;color:{Ink};padding-top:10px;"">
<span style=""float:left;font-family:{Serif};font-size:46px;line-height:38px;font-weight:bold;color:{Accent};padding:2px 8px 0 0;"">{Enc(drop)}</span>{Enc(rest)}</div>
</td></tr>");

        // Today's schedule
        if (d.Agenda.Count > 0)
        {
            var rows = new StringBuilder();
            foreach (var i in d.Agenda)
            {
                var when = i.Type == "event" && i.Detail.Contains(':') ? i.Detail : i.Date.ToString("ddd");
                rows.Append($@"<tr>
<td valign=""top"" style=""font-family:{Serif};font-size:12px;color:{Accent};padding:4px 10px 4px 0;white-space:nowrap;width:64px;"">{Enc(when)}</td>
<td style=""font-family:{Serif};font-size:13px;color:{Ink};padding:4px 0;border-bottom:1px dotted {Rule};"">
<strong>{Enc(i.Title)}</strong> <span style=""color:{Muted};"">— {Enc(i.Detail)}</span></td></tr>");
            }
            sb.Append(Section("The Day's Appointments", rows.ToString()));
        }

        // Ledger — market report
        if (d.Debts.Count > 0 || d.TotalOwed > 0)
        {
            var rows = new StringBuilder();
            rows.Append($@"<tr>
<td style=""font-family:{Serif};font-size:10px;letter-spacing:1px;color:{Muted};text-transform:uppercase;padding:2px 0;border-bottom:1px solid {Rule};"">Account</td>
<td align=""right"" style=""font-family:{Serif};font-size:10px;letter-spacing:1px;color:{Muted};text-transform:uppercase;padding:2px 0;border-bottom:1px solid {Rule};"">Balance</td>
<td align=""right"" style=""font-family:{Serif};font-size:10px;letter-spacing:1px;color:{Muted};text-transform:uppercase;padding:2px 0 2px 10px;border-bottom:1px solid {Rule};"">Rate</td></tr>");
            foreach (var debt in d.Debts)
                rows.Append($@"<tr>
<td style=""font-family:{Serif};font-size:13px;color:{Ink};padding:4px 0;"">{Enc(debt.Name)}</td>
<td align=""right"" style=""font-family:{Serif};font-size:13px;color:{Ink};padding:4px 0;"">{Money(debt.Balance)}</td>
<td align=""right"" style=""font-family:{Serif};font-size:12px;color:{Muted};padding:4px 0 4px 10px;"">{debt.AprPercent:0.#}%</td></tr>");
            rows.Append($@"<tr>
<td style=""font-family:{Serif};font-size:12px;font-weight:bold;color:{Ink};padding:6px 0 0;border-top:2px solid {Ink};"">The Index (total owed)</td>
<td align=""right"" style=""font-family:{Serif};font-size:13px;font-weight:bold;color:{Accent};padding:6px 0 0;border-top:2px solid {Ink};"">{Money(d.TotalOwed)}</td>
<td align=""right"" style=""font-family:{Serif};font-size:11px;color:{Muted};padding:6px 0 0 10px;border-top:2px solid {Ink};"">−{Money(d.MonthlyInterest)}/mo</td></tr>");
            sb.Append(Section("The Ledger · Market Report", rows.ToString()));
        }

        // Accounts settled
        if (d.Settlements.Count > 0)
        {
            var rows = new StringBuilder();
            foreach (var s in d.Settlements)
                rows.Append($@"<tr>
<td style=""font-family:{Serif};font-size:13px;color:{Ink};padding:4px 0;border-bottom:1px dotted {Rule};"">
<strong>{Enc(s.From)}</strong> <span style=""color:{Muted};font-style:italic;"">owes</span> <strong>{Enc(s.To)}</strong></td>
<td align=""right"" style=""font-family:{Serif};font-size:13px;color:{Accent};padding:4px 0;border-bottom:1px dotted {Rule};"">{Money(s.Amount)}</td></tr>");
            sb.Append(Section("Accounts Outstanding", rows.ToString()));
        }

        // From the kitchen
        if (d.Meals.Count > 0)
        {
            var rows = new StringBuilder();
            foreach (var m in d.Meals)
                rows.Append($@"<tr>
<td valign=""top"" style=""font-family:{Serif};font-size:12px;color:{Accent};text-transform:uppercase;padding:4px 10px 4px 0;width:52px;"">{Enc(m.Day)}</td>
<td style=""font-family:{Serif};font-size:13px;color:{Ink};padding:4px 0;border-bottom:1px dotted {Rule};"">{Enc(m.Title)}</td></tr>");
            sb.Append(Section("From the Kitchen", rows.ToString()));
        }

        // Notices (notes)
        if (d.Notes.Count > 0)
        {
            var rows = new StringBuilder();
            foreach (var n in d.Notes)
                rows.Append($@"<tr><td style=""font-family:{Serif};font-size:13px;color:{Ink};padding:5px 0;border-bottom:1px dotted {Rule};"">
&ldquo;{Enc(n.Content)}&rdquo; <span style=""color:{Muted};font-style:italic;"">— {Enc(n.Author)}</span></td></tr>");
            sb.Append(Section("Notices & Bulletins", rows.ToString()));
        }

        // Provisions (grocery)
        if (d.Grocery.Count > 0)
        {
            var names = string.Join(", ", d.Grocery.Take(12).Select(g => g.Quantity > 1 ? $"{g.Name} ×{g.Quantity}" : g.Name));
            if (d.Grocery.Count > 12) names += ", …";
            sb.Append(Section("The Provisions List",
                $@"<tr><td style=""font-family:{Serif};font-size:13px;color:{Ink};line-height:1.5;padding:4px 0;"">
<strong>{d.Grocery.Count}</strong> item(s) wanted: <span style=""color:{Muted};"">{Enc(names)}</span></td></tr>"));
        }

        // Colophon
        sb.Append($@"
<tr><td style=""padding:16px 24px 20px;border-top:3px double {Ink};text-align:center;font-family:{Serif};font-size:11px;color:{Muted};"">
Published each morning for the household &middot; <a href=""#"" style=""color:{Accent};"">The Dashboard</a> &middot; <a href=""#"" style=""color:{Accent};"">Manage Subscription</a></td></tr>");

        sb.Append("</table></td></tr></table></body></html>");
        return sb.ToString();
    }

    // A one-paragraph front-page summary from the day's counts.
    private static string BuildLede(HouseholdDigest d)
    {
        var parts = new List<string>();
        if (d.Overdue.Count > 0) parts.Add($"{d.Overdue.Count} matter{(d.Overdue.Count == 1 ? "" : "s")} demand{(d.Overdue.Count == 1 ? "s" : "")} immediate attention");
        if (d.Agenda.Count > 0) parts.Add($"{d.Agenda.Count} appointment{(d.Agenda.Count == 1 ? "" : "s")} fill the days ahead");
        if (d.Settlements.Count > 0) parts.Add("accounts remain to be settled between housemates");
        if (d.Grocery.Count > 0) parts.Add($"the pantry wants for {d.Grocery.Count} item{(d.Grocery.Count == 1 ? "" : "s")}");

        if (parts.Count == 0)
            return "The household reports a quiet morning: no chores overdue, no appointments pressing, and the books in good order. A rare and welcome calm.";

        var body = "This morning the household finds that " + string.Join("; ", parts) + ".";
        if (d.Meals.Count > 0) body += " The week's menu is set, and dinner plans are in hand.";
        return body;
    }

    private string Section(string title, string rowsHtml) => $@"
<tr><td style=""padding:14px 24px 4px;"">
<div style=""font-family:{Serif};font-size:13px;letter-spacing:2px;color:{Ink};text-transform:uppercase;font-weight:bold;border-bottom:2px solid {Ink};padding-bottom:3px;margin-bottom:4px;"">{Enc(title)}</div>
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">{rowsHtml}</table>
</td></tr>";

    private static string Money(decimal v) => "$" + v.ToString("#,##0.00");
    private static string Enc(string s) => WebUtility.HtmlEncode(s);
}
