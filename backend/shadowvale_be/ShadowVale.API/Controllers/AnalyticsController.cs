using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
using ShadowVale.BLL.Constants;
using ShadowVale.BLL.DTOs.Analytics;
using ShadowVale.BLL.Interfaces;

namespace ShadowVale.API.Controllers;

// Dashboards are readable by every role; raw data export only by Admins and Analysts
[ApiController]
[Route("api/analytics")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Analyst},{AppRoles.Designer}")]
public class AnalyticsController(IAnalyticsService analytics) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<ActionResult<OverviewDto>> Overview([FromQuery] AnalyticsQuery query, CancellationToken ct) =>
        Ok(await analytics.GetOverviewAsync(query, ct));

    [HttpGet("heatmap")]
    public async Task<ActionResult<HeatmapDto>> Heatmap([FromQuery] HeatmapQuery query, CancellationToken ct) =>
        Ok(await analytics.GetHeatmapAsync(query, ct));

    [HttpGet("funnel")]
    public async Task<ActionResult<FunnelDto>> Funnel([FromQuery] AnalyticsQuery query, CancellationToken ct) =>
        Ok(await analytics.GetFunnelAsync(query, ct));

    [HttpGet("weapons")]
    public async Task<ActionResult<WeaponUsageDto>> Weapons([FromQuery] AnalyticsQuery query, CancellationToken ct) =>
        Ok(await analytics.GetWeaponsAsync(query, ct));

    [HttpGet("playstyle")]
    public async Task<ActionResult<PlaystyleDto>> Playstyle([FromQuery] AnalyticsQuery query, CancellationToken ct) =>
        Ok(await analytics.GetPlaystyleAsync(query, ct));

    [HttpGet("versions/compare")]
    public async Task<ActionResult<VersionComparisonDto>> CompareVersions([FromQuery] VersionCompareQuery query, CancellationToken ct) =>
        Ok(await analytics.CompareVersionsAsync(query, ct));

    // Classical vs quantum-inspired; source is required
    [HttpGet("ai/comparison")]
    public async Task<ActionResult<IReadOnlyList<AiComparisonRowDto>>> AiComparison([FromQuery] AiComparisonQuery query, CancellationToken ct) =>
        Ok(await analytics.GetAiComparisonAsync(query, ct));

    // Latency by number of agents and nodes; source is required
    [HttpGet("ai/scalability")]
    public async Task<ActionResult<IReadOnlyList<ScalabilityRowDto>>> Scalability([FromQuery] AnalyticsQuery query, CancellationToken ct) =>
        Ok(await analytics.GetScalabilityAsync(query, ct));

    // dataset: sessions, events (needs from and to, at most 92 days apart), encounters or coordination-results
    [HttpGet("export/{dataset}")]
    [Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Analyst}")]
    [Produces("text/csv")]
    public async Task Export(string dataset, [FromQuery] AnalyticsQuery query, CancellationToken ct)
    {
        var export = await analytics.PrepareExportAsync(dataset, query, ct);

        Response.ContentType = "text/csv; charset=utf-8";
        Response.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment") { FileNameStar = export.FileName }.ToString();
        await export.WriteAsync(Response.Body, ct);
    }
}
