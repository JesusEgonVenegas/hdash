namespace backend.Services.Digest;

/// <summary>
/// Fires the daily digest once per day at a configured local hour. Checks
/// periodically and de-dupes on the calendar date so a restart mid-day won't
/// re-send. Single-instance assumption (fine for self-hosting); a multi-node
/// deploy would move this dedup into the database.
/// </summary>
public class DigestScheduler : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<DigestScheduler> _logger;
    private DateTime? _lastRunDate;

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

        var sendHour = _config.GetValue("Digest:Hour", 6);
        var checkInterval = TimeSpan.FromMinutes(_config.GetValue("Digest:CheckIntervalMinutes", 15));
        _logger.LogInformation("Digest scheduler active — sending daily at {Hour}:00 local.", sendHour);

        using var timer = new PeriodicTimer(checkInterval);
        do
        {
            try
            {
                var now = DateTime.Now;
                if (now.Hour >= sendHour && _lastRunDate?.Date != now.Date)
                {
                    _lastRunDate = now.Date;
                    await RunOnceAsync(stoppingToken);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Digest run failed; will retry next tick.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        var skipEmpty = _config.GetValue("Digest:SkipEmpty", true);
        var today = DateTime.UtcNow.Date;

        using var scope = _services.CreateScope();
        var dispatcher = scope.ServiceProvider.GetRequiredService<DigestDispatcher>();

        var households = await dispatcher.Service.GetHouseholdsAsync();
        _logger.LogInformation("Sending daily digest to {Count} household(s).", households.Count);
        foreach (var household in households)
            await dispatcher.SendForHouseholdAsync(household, today, skipEmpty, ct);

        // Solo users (no household) get a personal edition too.
        foreach (var user in await dispatcher.Service.GetSoloUsersAsync())
        {
            var digest = await dispatcher.Service.BuildForUserAsync(user, today);
            if (skipEmpty && !digest.HasAnything) continue;
            await dispatcher.SendAsync(digest, digest.RecipientEmails, ct);
        }
    }
}
