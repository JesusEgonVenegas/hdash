using System.Net;
using System.Text;

namespace backend.Services.Digest;

/// <summary>
/// A clean, email-safe baseline skin: table-based layout with fully inline styles
/// so it survives Gmail/Outlook (which strip &lt;style&gt; blocks and ignore flex/grid).
/// Deliberately neutral — the final visual direction (newspaper / terminal / board /
/// calm) drops in later as another <see cref="IDigestRenderer"/>.
/// </summary>
public class BaselineDigestRenderer : IDigestRenderer
{
    public string Name => "baseline";

    private const string Ink = "#23261f";
    private const string Muted = "#7a7d70";
    private const string Accent = "#2f6f4a";
    private const string Red = "#b3271e";
    private const string Line = "#e6e6de";
    private const string Card = "#ffffff";
    private const string Page = "#f4f5f1";
    private const string Font = "Georgia, 'Times New Roman', serif";
    private const string SansFont = "Arial, 'Helvetica Neue', sans-serif";

    public string Subject(HouseholdDigest d)
    {
        if (d.Overdue.Count > 0)
        {
            var one = d.Overdue.Count == 1;
            return $"☀ {d.HouseholdName}: {d.Overdue.Count} thing{(one ? "" : "s")} need{(one ? "s" : "")} attention";
        }
        if (d.Agenda.Count > 0)
            return $"☀ {d.HouseholdName}: {d.Agenda.Count} coming up";
        return $"☀ {d.HouseholdName}: all clear today";
    }

    public string Render(HouseholdDigest d)
    {
        var dateLabel = d.Date.ToString("dddd, MMMM d");
        var sb = new StringBuilder();

        sb.Append($@"<!DOCTYPE html>
<html lang=""en""><head><meta charset=""utf-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1"">
<title>{Enc(d.HouseholdName)} Digest</title></head>
<body style=""margin:0;padding:0;background:{Page};"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background:{Page};"">
<tr><td align=""center"" style=""padding:24px 12px;"">
<table role=""presentation"" width=""600"" cellpadding=""0"" cellspacing=""0"" style=""width:600px;max-width:100%;background:{Card};border:1px solid {Line};border-radius:12px;overflow:hidden;"">");

        // Header
        sb.Append($@"
<tr><td style=""padding:26px 28px 18px;border-bottom:1px solid {Line};"">
<div style=""font-family:{SansFont};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:{Accent};"">Daily digest</div>
<div style=""font-family:{Font};font-size:26px;color:{Ink};padding-top:4px;"">{Enc(d.HouseholdName)}</div>
<div style=""font-family:{SansFont};font-size:13px;color:{Muted};padding-top:2px;"">{Enc(dateLabel)}</div>
</td></tr>");

        if (!d.HasAnything)
        {
            sb.Append($@"
<tr><td style=""padding:34px 28px;font-family:{Font};font-size:16px;color:{Muted};text-align:center;"">
Nothing on the books today. Enjoy the quiet. ✓</td></tr>");
        }

        // Needs attention (overdue)
        if (d.Overdue.Count > 0)
        {
            sb.Append(SectionHeader("Needs attention", Red));
            foreach (var item in d.Overdue)
                sb.Append(ItemRow(item, isOverdue: true));
        }

        // Coming up (agenda)
        if (d.Agenda.Count > 0)
        {
            sb.Append(SectionHeader("Coming up", Accent));
            foreach (var item in d.Agenda)
                sb.Append(ItemRow(item, isOverdue: false));
        }

        // Ledger
        if (d.Debts.Count > 0)
            sb.Append(LedgerBlock(d));

        // Grocery
        if (d.Grocery.Count > 0)
            sb.Append(GroceryBlock(d));

        // Footer
        sb.Append($@"
<tr><td style=""padding:18px 28px 24px;border-top:1px solid {Line};font-family:{SansFont};font-size:12px;color:{Muted};text-align:center;"">
Compiled by HDASH · <a href=""#"" style=""color:{Accent};text-decoration:none;"">Open dashboard</a> · <a href=""#"" style=""color:{Accent};text-decoration:none;"">Delivery settings</a>
</td></tr>");

        sb.Append(@"
</table></td></tr></table></body></html>");
        return sb.ToString();
    }

    private static string SectionHeader(string label, string color) => $@"
<tr><td style=""padding:20px 28px 6px;"">
<div style=""font-family:{SansFont};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:{color};font-weight:bold;border-bottom:2px solid {color};padding-bottom:6px;"">{Enc(label)}</div>
</td></tr>";

    private string ItemRow(DigestItem item, bool isOverdue)
    {
        var whenColor = isOverdue ? Red : Muted;
        var when = isOverdue ? "Overdue" : item.Date.ToString("ddd MMM d");
        var typeTag = item.Type.ToUpperInvariant();
        return $@"
<tr><td style=""padding:9px 28px;border-bottom:1px solid {Line};"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0""><tr>
<td style=""font-family:{SansFont};font-size:11px;color:{whenColor};width:92px;vertical-align:top;"">{Enc(when)}</td>
<td style=""font-family:{Font};font-size:15px;color:{Ink};vertical-align:top;"">{Enc(item.Title)}
<div style=""font-family:{SansFont};font-size:12px;color:{Muted};padding-top:2px;"">{Enc(typeTag)} · {Enc(item.Detail)}</div></td>
</tr></table></td></tr>";
    }

    private string LedgerBlock(HouseholdDigest d)
    {
        var rows = new StringBuilder();
        foreach (var debt in d.Debts)
        {
            rows.Append($@"
<tr>
<td style=""font-family:{Font};font-size:14px;color:{Ink};padding:6px 0;border-bottom:1px solid {Line};"">{Enc(debt.Name)}</td>
<td align=""right"" style=""font-family:{SansFont};font-size:13px;color:{Ink};padding:6px 0;border-bottom:1px solid {Line};"">{Money(debt.Balance)}</td>
<td align=""right"" style=""font-family:{SansFont};font-size:12px;color:{Red};padding:6px 0;border-bottom:1px solid {Line};"">+{Money(debt.MonthlyInterest)}/mo</td>
<td align=""right"" style=""font-family:{SansFont};font-size:12px;color:{Muted};padding:6px 0;border-bottom:1px solid {Line};"">{Enc(debt.NextDueLabel)}</td>
</tr>");
        }

        return SectionHeader("The ledger", Accent) + $@"
<tr><td style=""padding:8px 28px 4px;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">{rows}
<tr>
<td style=""font-family:{SansFont};font-size:13px;color:{Ink};padding-top:10px;font-weight:bold;"">Total owed</td>
<td align=""right"" style=""font-family:{SansFont};font-size:15px;color:{Ink};padding-top:10px;font-weight:bold;"">{Money(d.TotalOwed)}</td>
<td align=""right"" colspan=""2"" style=""font-family:{SansFont};font-size:12px;color:{Red};padding-top:10px;"">{Money(d.MonthlyInterest)}/mo interest</td>
</tr>
</table></td></tr>";
    }

    private string GroceryBlock(HouseholdDigest d)
    {
        var names = string.Join(", ", d.Grocery.Select(g => g.Quantity > 1 ? $"{Enc(g.Name)} ×{g.Quantity}" : Enc(g.Name)));
        return SectionHeader("Shopping list", Accent) + $@"
<tr><td style=""padding:10px 28px 20px;"">
<span style=""font-family:{SansFont};font-size:22px;font-weight:bold;color:{Accent};"">{d.Grocery.Count}</span>
<span style=""font-family:{SansFont};font-size:13px;color:{Muted};""> items waiting</span>
<div style=""font-family:{Font};font-size:14px;color:{Ink};padding-top:6px;"">{names}</div>
</td></tr>";
    }

    private static string Money(decimal v) => "$" + v.ToString("#,##0.00");
    private static string Enc(string s) => WebUtility.HtmlEncode(s);
}
