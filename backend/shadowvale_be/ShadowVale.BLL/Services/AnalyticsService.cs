using ShadowVale.BLL.DTOs.Analytics;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Mappings;
using ShadowVale.Contracts.Telemetry;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Queries;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services;

// Dashboards for balancing (A-01..A-08) and the solver comparison (A-09, A-10), plus CSV export (A-12).
// Human play and replay runs are never mixed: dashboards default to human, solver comparisons must pick one.
public class AnalyticsService(IAnalyticsRepository analytics, IGameContentRepository content) : IAnalyticsService
{
    private static readonly TimeSpan MaxRange = TimeSpan.FromDays(366);
    private static readonly TimeSpan MaxEventExportRange = TimeSpan.FromDays(92);
    private static readonly string[] DefaultHeatmapEvents = [TelemetryEventTypes.PlayerDeath, TelemetryEventTypes.PlayerSpotted];

    public async Task<OverviewDto> GetOverviewAsync(AnalyticsQuery query, CancellationToken ct = default) =>
        await OverviewAsync(ToFilter(query), ct);

    public async Task<HeatmapDto> GetHeatmapAsync(HeatmapQuery query, CancellationToken ct = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(query.MapCode))
            errors[nameof(query.MapCode)] = ["MapCode is required for a heat map."];
        if (query.CellSize is < 1 or > 50)
            errors[nameof(query.CellSize)] = ["CellSize must be between 1 and 50 metres."];
        var eventTypes = query.EventTypes is { Length: > 0 } ? query.EventTypes.Distinct().ToArray() : DefaultHeatmapEvents;
        if (eventTypes.Any(t => !TelemetryEventTypes.All.Contains(t)))
            errors[nameof(query.EventTypes)] = [$"Unknown event type. Allowed: {string.Join(", ", TelemetryEventTypes.All)}."];
        if (errors.Count > 0)
            throw new ValidationException(errors);

        // The map filters events (a session can visit several maps), not sessions
        var mapCode = query.MapCode!.Trim();
        var filter = ToFilter(query) with { MapCode = null };
        var cells = await analytics.GetHeatmapAsync(filter, mapCode, eventTypes, query.CellSize, ct);
        return new HeatmapDto(mapCode, query.CellSize, eventTypes, cells.Select(c => new HeatCellDto(c.X, c.Y, c.Count)).ToList());
    }

    public async Task<FunnelDto> GetFunnelAsync(AnalyticsQuery query, CancellationToken ct = default) =>
        await FunnelAsync(ToFilter(query), ct);

    public async Task<WeaponUsageDto> GetWeaponsAsync(AnalyticsQuery query, CancellationToken ct = default) =>
        await WeaponsAsync(ToFilter(query), ct);

    public async Task<PlaystyleDto> GetPlaystyleAsync(AnalyticsQuery query, CancellationToken ct = default)
    {
        var filter = ToFilter(query);
        var summary = await analytics.GetPlaystyleAsync(filter, ct);
        var buckets = (await analytics.GetStealthHistogramAsync(filter, ct)).ToDictionary(b => b.Bucket, b => b.Count);

        var histogram = Enumerable.Range(0, 10)
            .Select(i => new HistogramBucketDto(i / 10.0, (i + 1) / 10.0, buckets.GetValueOrDefault(i)))
            .ToList();
        return new PlaystyleDto(summary.Sessions, summary.SessionsWithoutKills, summary.AvgStealthRatio, summary.MedianStealthRatio,
            summary.AvgTimesDetected, summary.MedianTimesDetected, histogram);
    }

    public async Task<VersionComparisonDto> CompareVersionsAsync(VersionCompareQuery query, CancellationToken ct = default)
    {
        if (query.A == Guid.Empty || query.B == Guid.Empty)
            throw new ValidationException("A", "Both content versions (a and b) are required.");
        foreach (var id in new[] { query.A, query.B })
        {
            if (!await content.VersionExistsAsync(id, ct))
                throw new NotFoundException("Content version", id);
        }

        var filter = ToFilter(query);
        return new VersionComparisonDto(
            await SnapshotAsync(filter with { ContentVersionId = query.A }, ct),
            await SnapshotAsync(filter with { ContentVersionId = query.B }, ct));
    }

    public async Task<IReadOnlyList<AiComparisonRowDto>> GetAiComparisonAsync(AiComparisonQuery query, CancellationToken ct = default)
    {
        var filter = ToFilter(query, sourceRequired: true);
        var groupBy = EnumParsing.Parse<AnalyticsGroupBy>(query.GroupBy, nameof(query.GroupBy));

        var encounters = await analytics.GetEncounterMetricsAsync(filter, groupBy, ct);
        var replans = await analytics.GetReplanMetricsAsync(filter, groupBy, ct);

        // Full outer merge on (content version, group): a group may have encounters but no re-plan, or the reverse
        var rows = new Dictionary<(Guid?, string), AiComparisonRowDto>();
        foreach (var e in encounters)
        {
            rows[(e.ContentVersionId, e.GroupKey)] = new AiComparisonRowDto(
                e.ContentVersionId, e.ContentVersionLabel, e.GroupKey, e.GroupLabel, e.Family,
                e.Sessions, e.Encounters, e.Captures, e.Escapes, Ratio(e.Captures, e.Encounters),
                e.AvgEscapeSeconds, e.MedianEscapeSeconds,
                0, null, null, null, null, null, null);
        }
        foreach (var r in replans)
        {
            var key = (r.ContentVersionId, r.GroupKey);
            var row = rows.GetValueOrDefault(key) ?? new AiComparisonRowDto(
                r.ContentVersionId, r.ContentVersionLabel, r.GroupKey, r.GroupLabel, r.Family,
                0, 0, 0, 0, null, null, null, 0, null, null, null, null, null, null);
            rows[key] = row with
            {
                Replans = r.Replans,
                AvgCoordinationScore = r.AvgCoordinationScore,
                LatencyP50Ms = r.LatencyP50,
                LatencyP95Ms = r.LatencyP95,
                LatencyP99Ms = r.LatencyP99,
                WithinBudgetRate = r.WithinBudgetRate,
                FallbackRate = r.FallbackRate
            };
        }

        return rows.Values.OrderBy(r => r.ContentVersionLabel).ThenBy(r => r.GroupLabel, StringComparer.Ordinal).ToList();
    }

    public async Task<IReadOnlyList<ScalabilityRowDto>> GetScalabilityAsync(AnalyticsQuery query, CancellationToken ct = default)
    {
        var rows = await analytics.GetScalabilityAsync(ToFilter(query, sourceRequired: true), ct);
        return rows.Select(r => new ScalabilityRowDto(r.ConfigurationId, r.Code, r.Family, r.NumAgents, r.NodesFrom, r.NodesFrom + 19,
            r.Replans, r.LatencyP50, r.LatencyP95, r.AvgObjective, r.WithinBudgetRate)).ToList();
    }

    public Task<CsvExport> PrepareExportAsync(string dataset, AnalyticsQuery query, CancellationToken ct = default)
    {
        var filter = ToFilter(query);
        var stamp = $"{filter.Source.ToString().ToLowerInvariant()}-{DateTime.UtcNow:yyyyMMdd-HHmmss}";

        CsvExport export = dataset switch
        {
            "sessions" => new($"sessions-{stamp}.csv",
                (stream, token) => CsvWriter.WriteAsync(stream, CsvColumns.Sessions, analytics.ExportSessionsAsync(filter, token), token)),
            "events" => EventsExport(query, filter, stamp),
            "encounters" => new($"encounters-{stamp}.csv",
                (stream, token) => CsvWriter.WriteAsync(stream, CsvColumns.Encounters, analytics.ExportEncountersAsync(filter, token), token)),
            "coordination-results" => new($"coordination-results-{stamp}.csv",
                (stream, token) => CsvWriter.WriteAsync(stream, CsvColumns.Results, analytics.ExportResultsAsync(filter, token), token)),
            _ => throw new NotFoundException($"Unknown export '{dataset}'. Use sessions, events, encounters or coordination-results.")
        };
        return Task.FromResult(export);
    }

    // The events table is the big one: its export needs an explicit window of at most 92 days
    private CsvExport EventsExport(AnalyticsQuery query, AnalyticsFilter filter, string stamp)
    {
        if (query.From is null || query.To is null || query.To - query.From > MaxEventExportRange)
            throw new ValidationException("From", $"Exporting events needs From and To at most {MaxEventExportRange.Days} days apart.");
        return new CsvExport($"events-{stamp}.csv",
            (stream, token) => CsvWriter.WriteAsync(stream, CsvColumns.Events, analytics.ExportEventsAsync(filter, token), token));
    }

    private async Task<VersionSnapshotDto> SnapshotAsync(AnalyticsFilter filter, CancellationToken ct) =>
        new(filter.ContentVersionId!.Value, await OverviewAsync(filter, ct), await FunnelAsync(filter, ct), await WeaponsAsync(filter, ct));

    private async Task<OverviewDto> OverviewAsync(AnalyticsFilter filter, CancellationToken ct)
    {
        var summary = await analytics.GetOverviewAsync(filter, ct);
        var outcomes = await analytics.GetOutcomeCountsAsync(filter, ct);
        var perDay = await analytics.GetSessionsPerDayAsync(filter, ct);

        return new OverviewDto(summary.Sessions, summary.Players, summary.Unfinished, summary.AvgDurationSeconds, summary.MedianDurationSeconds,
            outcomes.Select(o => new OutcomeShareDto(o.Key, o.Count, Ratio(o.Count, summary.Sessions) ?? 0)).ToList(),
            perDay.Select(d => new DailyCountDto(d.Day, d.Count)).ToList());
    }

    private async Task<FunnelDto> FunnelAsync(AnalyticsFilter filter, CancellationToken ct)
    {
        var started = await analytics.CountSessionsAsync(filter, finishedOnly: false, ct);
        var steps = await analytics.GetObjectiveStepsAsync(filter, ct);
        var completed = await analytics.CountMissionsCompletedAsync(filter, ct);

        return new FunnelDto(started,
            steps.Select(s => new FunnelStepDto(s.Step, s.Sessions, Ratio(s.Sessions, started))).ToList(),
            completed, Ratio(completed, started));
    }

    private async Task<WeaponUsageDto> WeaponsAsync(AnalyticsFilter filter, CancellationToken ct)
    {
        var finished = await analytics.CountSessionsAsync(filter, finishedOnly: true, ct);
        var weapons = await analytics.GetWeaponsAsync(filter, ct);

        return new WeaponUsageDto(finished, weapons.Select(w => new WeaponDto(
            w.Weapon, w.Shots, w.Kills, Ratio(w.Kills, w.Shots), w.SessionsUsed, Ratio(w.SessionsUsed, finished))).ToList());
    }

    private static double? Ratio(long part, long whole) => whole == 0 ? null : (double)part / whole;

    private static AnalyticsFilter ToFilter(AnalyticsQuery query, bool sourceRequired = false)
    {
        var errors = new Dictionary<string, string[]>();

        var source = SessionSource.Human;
        if (string.IsNullOrWhiteSpace(query.Source))
        {
            if (sourceRequired)
                errors[nameof(query.Source)] = ["Choose 'human' or 'replay': solver comparisons never mix the two."];
        }
        else if (!EnumParsing.TryParse(query.Source, out source))
        {
            errors[nameof(query.Source)] = ["Source must be 'human' or 'replay'."];
        }

        SolverFamily? family = null;
        if (!string.IsNullOrWhiteSpace(query.Family))
        {
            if (EnumParsing.TryParse<SolverFamily>(query.Family, out var parsed))
                family = parsed;
            else
                errors[nameof(query.Family)] = [$"Family must be one of: {string.Join(", ", Enum.GetNames<SolverFamily>())}."];
        }

        if (query.From is { } from && query.To is { } to)
        {
            if (from > to)
                errors[nameof(query.From)] = ["From must not be after To."];
            else if (to - from > MaxRange)
                errors[nameof(query.To)] = [$"The time window can be at most {MaxRange.Days} days."];
        }

        if (errors.Count > 0)
            throw new ValidationException(errors);

        return new AnalyticsFilter(
            source,
            query.ContentVersionId,
            string.IsNullOrWhiteSpace(query.MapCode) ? null : query.MapCode.Trim(),
            query.From?.UtcDateTime,
            query.To?.UtcDateTime,
            query.SolverConfigurationId,
            family);
    }
}
