using System.Text.Json;
using WebPush;

namespace backend.Services.Push;

/// <summary>
/// Supplies the VAPID keypair used to sign Web Push messages. Prefers keys from
/// config (Push:PublicKey / Push:PrivateKey); otherwise auto-generates a pair and
/// persists it to vapid-keys.json so self-hosters get working push with no setup
/// and existing subscriptions survive restarts.
/// </summary>
public class VapidKeyProvider
{
    public string PublicKey { get; } = "";
    public string PrivateKey { get; } = "";
    public string Subject { get; }
    public bool Enabled { get; }

    private record VapidKeys(string PublicKey, string PrivateKey);

    public VapidKeyProvider(IConfiguration config, IHostEnvironment env, ILogger<VapidKeyProvider> logger)
    {
        Subject = config["Push:Subject"] ?? "mailto:admin@hdash.local";

        var pub = config["Push:PublicKey"];
        var priv = config["Push:PrivateKey"];
        if (!string.IsNullOrWhiteSpace(pub) && !string.IsNullOrWhiteSpace(priv))
        {
            PublicKey = pub;
            PrivateKey = priv;
            Enabled = true;
            return;
        }

        var path = Path.Combine(env.ContentRootPath, "vapid-keys.json");
        try
        {
            if (File.Exists(path))
            {
                var saved = JsonSerializer.Deserialize<VapidKeys>(File.ReadAllText(path));
                if (saved is not null && !string.IsNullOrWhiteSpace(saved.PublicKey))
                {
                    PublicKey = saved.PublicKey;
                    PrivateKey = saved.PrivateKey;
                    Enabled = true;
                    return;
                }
            }

            var keys = VapidHelper.GenerateVapidKeys();
            File.WriteAllText(path, JsonSerializer.Serialize(new VapidKeys(keys.PublicKey, keys.PrivateKey)));
            PublicKey = keys.PublicKey;
            PrivateKey = keys.PrivateKey;
            Enabled = true;
            logger.LogInformation("Generated new VAPID keys at {Path}", path);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not set up VAPID keys; web push disabled.");
            Enabled = false;
        }
    }
}
