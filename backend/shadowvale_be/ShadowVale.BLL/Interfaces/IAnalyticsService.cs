using ShadowVale.BLL.DTOs.Analytics;

namespace ShadowVale.BLL.Interfaces;

public interface IAnalyticsService
{
    Task<OverviewDto> GetOverviewAsync(AnalyticsQuery query, CancellationToken ct = default);
    Task<HeatmapDto> GetHeatmapAsync(HeatmapQuery query, CancellationToken ct = default);
    Task<FunnelDto> GetFunnelAsync(AnalyticsQuery query, CancellationToken ct = default);
    Task<WeaponUsageDto> GetWeaponsAsync(AnalyticsQuery query, CancellationToken ct = default);
    Task<PlaystyleDto> GetPlaystyleAsync(AnalyticsQuery query, CancellationToken ct = default);
    Task<VersionComparisonDto> CompareVersionsAsync(VersionCompareQuery query, CancellationToken ct = default);
    Task<IReadOnlyList<AiComparisonRowDto>> GetAiComparisonAsync(AiComparisonQuery query, CancellationToken ct = default);
    Task<IReadOnlyList<ScalabilityRowDto>> GetScalabilityAsync(AnalyticsQuery query, CancellationToken ct = default);

    // Validates first (errors still become ProblemDetails), then returns a writer that streams the CSV
    Task<CsvExport> PrepareExportAsync(string dataset, AnalyticsQuery query, CancellationToken ct = default);
}
