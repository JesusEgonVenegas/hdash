using backend.Models;

namespace backend.Services.Digest;

/// <summary>
/// Delivers the daily digest to each opted-in person at their own preferred hour
/// (falling back to the global default). Catch-up semantics: if the process was
/// down at someone's hour, they still get today's edition once it comes back.
/// De-dupes per user per calendar date. Single-instance assumption (fine for
/// self-hosting); a multi-node deploy would move the dedup into the database.
/// </summary>
public class DigestScheduler : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<DigestScheduler> _logger;

    private readonly HashSet<string> _sentToday = new();
    private DateTime _sentDate = DateTime.MinValue;

    public DigestScheduler(IServiceProvider services, IConfiguration config, ILogger<DigestScheduler> logger)
    {
        _services = services;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_config.GetValue("Digest:Enabled", false))
        {
            _logger.LogInformation("Digest scheduler disabled (Digest:Enabled=false).");
            return;
        }

        var checkInterval = TimeSpan.FromMinutes(_config.GetValue("Digest:CheckIntervalMinutes", 15));
        _logger.LogInformation("Digest scheduler active — delivering per-user at their chosen hour (default {Hour}:00).",
            _config.GetValue("Digest:Hour", 6));

        using var timer = new PeriodicTimer(checkInterval);
        do
        {
            try { await RunTickAsync(stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Digest tick failed; will retry next interval.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunTickAsync(CancellationToken ct)
    {
        var now = DateTime.Now;
        var currentHour = now.Hour;
        var today = DateTime.UtcNow.Date;
        var globalHour = _config.GetValue("Digest:Hour", 6);
        var skipEmpty = _config.GetValue("Digest:SkipEmpty", true);

        // New day → clear the sent ledger.
        if (_sentDate != now.Date) { _sentToday.Clear(); _sentDate = now.Date; }

        bool Due(ApplicationUser u) =>
            u.DigestOptIn
            && !string.IsNullOrEmpty(u.Email)
            && currentHour >= (u.DigestHour ?? globalHour)
            && !_sentToday.Contains(Key(u.Id, today));

        using var scope = _services.CreateScope();
        var dispatcher = scope.ServiceProvider.GetRequiredService<DigestDispatcher>();

        // Household editions — build once, deliver to each due member individually.
        foreach (var household in await dispatcher.Service.GetHouseholdsAsync())
        {
            var due = household.Members.Where(Due).ToList();
            if (due.Count == 0) continue;

            var digest = await dispatcher.Service.BuildForHouseholdAsync(household, today);
            foreach (var member in due)
            {
                if (!(skipEmpty && !digest.HasAnything))
                    await dispatcher.SendAsync(digest, new[] { member.Email! }, ct);
                _sentToday.Add(Key(member.Id, today));
            }
        }

        // Solo editions.
        foreach (var user in await dispatcher.Service.GetSoloUsersAsync())
        {
            if (!Due(user)) continue;
            var digest = await dispatcher.Service.BuildForUserAsync(user, today);
            if (!(skipEmpty && !digest.HasAnything))
                await dispatcher.SendAsync(digest, new[] { user.Email! }, ct);
            _sentToday.Add(Key(user.Id, today));
        }
    }

    private static string Key(string userId, DateTime date) => $"{userId}:{date:yyyyMMdd}";
}
