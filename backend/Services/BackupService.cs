using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Periodically snapshots the SQLite database with <c>VACUUM INTO</c> (a
/// consistent, WAL-safe copy) and keeps the newest N snapshots. Config-gated so
/// dev stays clean; turn on in production so a lost volume isn't a lost household.
/// </summary>
public class BackupService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<BackupService> _logger;

    public BackupService(IServiceProvider services, IConfiguration config, ILogger<BackupService> logger)
    {
        _services = services;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_config.GetValue("Backup:Enabled", false))
        {
            _logger.LogInformation("Backup service disabled (Backup:Enabled=false).");
            return;
        }

        var interval = TimeSpan.FromHours(Math.Max(1, _config.GetValue("Backup:IntervalHours", 24)));
        _logger.LogInformation("Backup service active — every {Hours}h.", interval.TotalHours);

        // Back up once at startup, then on the interval.
        await BackupOnceAsync(stoppingToken);
        using var timer = new PeriodicTimer(interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try { await BackupOnceAsync(stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Backup failed; will retry next interval.");
            }
        }
    }

    private async Task BackupOnceAsync(CancellationToken ct)
    {
        var dir = Path.GetFullPath(_config["Backup:Directory"] ?? "backups");
        Directory.CreateDirectory(dir);

        var target = Path.Combine(dir, $"app-{DateTime.UtcNow:yyyyMMdd-HHmmss}.db");

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // VACUUM INTO takes a string literal, not a parameter; escape single quotes.
        var safe = target.Replace("'", "''");
        await db.Database.ExecuteSqlRawAsync($"VACUUM INTO '{safe}'", ct);

        _logger.LogInformation("Database backed up to {Target}", target);
        Prune(dir);
    }

    private void Prune(string dir)
    {
        var keep = Math.Max(1, _config.GetValue("Backup:KeepCount", 7));
        var stale = Directory.GetFiles(dir, "app-*.db")
            .OrderByDescending(f => f)   // filenames are timestamp-sortable
            .Skip(keep)
            .ToList();

        foreach (var file in stale)
        {
            try { File.Delete(file); }
            catch (Exception ex) { _logger.LogWarning(ex, "Could not delete old backup {File}", file); }
        }

        if (stale.Count > 0)
            _logger.LogInformation("Pruned {Count} old backup(s), keeping newest {Keep}.", stale.Count, keep);
    }
}
