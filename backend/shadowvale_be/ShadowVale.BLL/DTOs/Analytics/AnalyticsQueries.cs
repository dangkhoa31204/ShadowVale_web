namespace ShadowVale.BLL.DTOs.Analytics;

// Filters shared by every analytics endpoint (query string). All are optional except where an endpoint says otherwise.
public record AnalyticsQuery
{
    // "human" or "replay". Defaults to human, except for the solver comparisons where it must be chosen.
    public string? Source { get; init; }
    public Guid? ContentVersionId { get; init; }
    public string? MapCode { get; init; }

    // Session start time window (at most 366 days)
    public DateTimeOffset? From { get; init; }
    public DateTimeOffset? To { get; init; }

    // Solver assigned to the session
    public Guid? SolverConfigurationId { get; init; }
    public string? Family { get; init; }
}

public sealed record HeatmapQuery : AnalyticsQuery
{
    // Event types to plot; defaults to player_death and player_spotted
    public string[]? EventTypes { get; init; }

    // Cell size in metres, 1-50
    public int CellSize { get; init; } = 5;
}

public sealed record VersionCompareQuery : AnalyticsQuery
{
    public Guid A { get; init; }
    public Guid B { get; init; }
}

public sealed record AiComparisonQuery : AnalyticsQuery
{
    // "configuration" (each solver configuration) or "family" (classical vs quantum-inspired)
    public string GroupBy { get; init; } = "configuration";
}
