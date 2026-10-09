using ShadowVale.DAL.Queries;

namespace ShadowVale.DAL.Repositories.Interfaces;

public enum AnalyticsGroupBy
{
    Configuration,
    Family
}

// Read-only aggregates over game sessions, events, session stats and coordination results
public interface IAnalyticsRepository
{
    Task<OverviewRow> GetOverviewAsync(AnalyticsFilter filter, CancellationToken ct = default);
    Task<List<KeyCountRow>> GetOutcomeCountsAsync(AnalyticsFilter filter, CancellationToken ct = default);
    Task<List<DayCountRow>> GetSessionsPerDayAsync(AnalyticsFilter filter, CancellationToken ct = default);

    // Event positions on one map, counted per square cell (cellSize metres)
    Task<List<HeatCellRow>> GetHeatmapAsync(AnalyticsFilter filter, string mapCode, IReadOnlyList<string> eventTypes, int cellSize, CancellationToken ct = default);

    Task<long> CountSessionsAsync(AnalyticsFilter filter, bool finishedOnly, CancellationToken ct = default);
    Task<List<FunnelStepRow>> GetObjectiveStepsAsync(AnalyticsFilter filter, CancellationToken ct = default);
    Task<long> CountMissionsCompletedAsync(AnalyticsFilter filter, CancellationToken ct = default);

    // From session stats of finished sessions
    Task<List<WeaponRow>> GetWeaponsAsync(AnalyticsFilter filter, CancellationToken ct = default);
    Task<PlaystyleRow> GetPlaystyleAsync(AnalyticsFilter filter, CancellationToken ct = default);
    Task<List<BucketRow>> GetStealthHistogramAsync(AnalyticsFilter filter, CancellationToken ct = default);

    // Grouped by the solver assigned to the session, per content version
    Task<List<EncounterMetricsRow>> GetEncounterMetricsAsync(AnalyticsFilter filter, AnalyticsGroupBy groupBy, CancellationToken ct = default);
    Task<List<ReplanMetricsRow>> GetReplanMetricsAsync(AnalyticsFilter filter, AnalyticsGroupBy groupBy, CancellationToken ct = default);

    // Grouped by the configuration that produced each result, number of agents and node bucket (width 20)
    Task<List<ScalabilityRow>> GetScalabilityAsync(AnalyticsFilter filter, CancellationToken ct = default);

    // Streamed row by row for CSV export
    IAsyncEnumerable<SessionExportRow> ExportSessionsAsync(AnalyticsFilter filter, CancellationToken ct = default);
    IAsyncEnumerable<EventExportRow> ExportEventsAsync(AnalyticsFilter filter, CancellationToken ct = default);
    IAsyncEnumerable<EncounterExportRow> ExportEncountersAsync(AnalyticsFilter filter, CancellationToken ct = default);
    IAsyncEnumerable<ResultExportRow> ExportResultsAsync(AnalyticsFilter filter, CancellationToken ct = default);
}
