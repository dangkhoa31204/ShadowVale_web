namespace ShadowVale.BLL.DTOs.Analytics;

// A-01
public sealed record OverviewDto(
    long Sessions,
    long Players,
    long UnfinishedSessions,
    double? AvgDurationSeconds,
    double? MedianDurationSeconds,
    IReadOnlyList<OutcomeShareDto> Outcomes,
    IReadOnlyList<DailyCountDto> SessionsPerDay);

public sealed record OutcomeShareDto(string Outcome, long Sessions, double Share);

public sealed record DailyCountDto(DateOnly Day, long Sessions);

// A-04: X / Y are the lower corner of the cell (world X / Z in metres)
public sealed record HeatmapDto(string MapCode, int CellSize, IReadOnlyList<string> EventTypes, IReadOnlyList<HeatCellDto> Cells);

public sealed record HeatCellDto(double X, double Y, long Count);

// A-05: sessions reaching each objective, then winning the mission
public sealed record FunnelDto(long SessionsStarted, IReadOnlyList<FunnelStepDto> Objectives, long MissionsCompleted, double? CompletionRate);

public sealed record FunnelStepDto(int ObjectiveIndex, long Sessions, double? ShareOfStarted);

// A-06 (from session stats: exact even though shot events are throttled)
public sealed record WeaponUsageDto(long FinishedSessions, IReadOnlyList<WeaponDto> Weapons);

public sealed record WeaponDto(string Weapon, long Shots, long Kills, double? KillsPerShot, long SessionsUsed, double? SessionShare);

// A-07: stealth ratio = takedowns / (takedowns + weapon kills), per finished session that had at least one kill
public sealed record PlaystyleDto(
    long FinishedSessions,
    long SessionsWithoutKills,
    double? AvgStealthRatio,
    double? MedianStealthRatio,
    double? AvgTimesDetected,
    double? MedianTimesDetected,
    IReadOnlyList<HistogramBucketDto> StealthRatioHistogram);

public sealed record HistogramBucketDto(double From, double To, long Sessions);

// A-08
public sealed record VersionComparisonDto(VersionSnapshotDto A, VersionSnapshotDto B);

public sealed record VersionSnapshotDto(Guid ContentVersionId, OverviewDto Overview, FunnelDto Funnel, WeaponUsageDto Weapons);

// A-09: one row per content version and solver group (configuration or family), by the solver assigned to the session.
// Capture rate = captured / encounters (aborted encounters excluded); escape time only over escapes.
public sealed record AiComparisonRowDto(
    Guid? ContentVersionId,
    string? ContentVersionLabel,
    string GroupKey,
    string GroupLabel,
    string Family,
    long Sessions,
    long Encounters,
    long Captures,
    long Escapes,
    double? CaptureRate,
    double? AvgEscapeSeconds,
    double? MedianEscapeSeconds,
    long Replans,
    double? AvgCoordinationScore,
    double? LatencyP50Ms,
    double? LatencyP95Ms,
    double? LatencyP99Ms,
    double? WithinBudgetRate,
    double? FallbackRate);

// A-10: latency by problem size, per solver configuration
public sealed record ScalabilityRowDto(
    Guid ConfigurationId,
    string Code,
    string Family,
    int NumAgents,
    int NodesFrom,
    int NodesTo,
    long Replans,
    double? LatencyP50Ms,
    double? LatencyP95Ms,
    double? AvgObjective,
    double? WithinBudgetRate);

// A-12: file name plus a writer that streams the CSV
public sealed record CsvExport(string FileName, Func<Stream, CancellationToken, Task> WriteAsync);
