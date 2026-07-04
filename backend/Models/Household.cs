using System.Security.Cryptography;

namespace backend.Models;

public class Household
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string InviteCode { get; set; } = GenerateInviteCode();
    public string OwnerId { get; set; } = string.Empty;

    // How shared expenses divide: "equal" (per-head) or "proportional" (by member income).
    public string SplitMode { get; set; } = "equal";

    public ApplicationUser Owner { get; set; } = null!;
    public List<ApplicationUser> Members { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public static string GenerateInviteCode()
    {
        // Crypto-strong RNG so invite codes aren't guessable from timing/seed.
        // Ambiguous characters (0/O, 1/I) are excluded for readability.
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var code = new char[6];
        for (var i = 0; i < code.Length; i++)
            code[i] = chars[RandomNumberGenerator.GetInt32(chars.Length)];
        return new string(code);
    }
}
