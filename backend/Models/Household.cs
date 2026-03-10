namespace backend.Models;

public class Household
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string InviteCode { get; set; } = GenerateInviteCode();
    public string OwnerId { get; set; } = string.Empty;
    public ApplicationUser Owner { get; set; } = null!;
    public List<ApplicationUser> Members { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public static string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var random = new Random();
        return new string(
            Enumerable.Range(0, 6).Select(_ => chars[random.Next(chars.Length)]).ToArray()
        );
    }
}
