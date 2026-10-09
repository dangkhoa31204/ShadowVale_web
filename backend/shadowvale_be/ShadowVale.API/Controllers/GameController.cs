using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Net.Http.Headers;
using ShadowVale.API.Authentication;
using ShadowVale.BLL.DTOs.Game;
using ShadowVale.BLL.Interfaces;
using ShadowVale.Contracts.Game;
using ShadowVale.Contracts.Telemetry;

namespace ShadowVale.API.Controllers;

// Endpoints called by the Unity game (header X-Game-Key, no user login).
// Status codes the game relies on: 2xx and 409 = done; 400 / 413 = drop; anything else = retry later.
[ApiController]
[Route("api/game")]
[Authorize(Policy = AuthPolicies.Game)]
[EnableRateLimiting(RateLimitPolicy)]
public class GameController(IGameContentService gameContent, IGameSessionService gameSessions) : ControllerBase
{
    public const string RateLimitPolicy = "game";

    // One session batch is at most ~0.6 MB (4,000 events); anything far larger is refused before it is read
    private const long MaxUploadBytes = 2 * 1024 * 1024;

    [HttpGet("content/manifest")]
    public async Task<ActionResult<ContentManifest>> GetManifest(CancellationToken ct) =>
        Ok(await gameContent.GetManifestAsync(ct));

    // The published bundle. Send the checksum back in If-None-Match to get 304 when nothing changed.
    [HttpGet("content/bundle")]
    [Produces("application/json")]
    public async Task<IActionResult> GetBundle(CancellationToken ct) =>
        BundleResult(await gameContent.GetPublishedBundleAsync(ct));

    // A version that was published at some point (also archived ones), so the replay harness can rerun old sessions
    [HttpGet("content/versions/{versionId:guid}/bundle")]
    [Produces("application/json")]
    public async Task<IActionResult> GetVersionBundle(Guid versionId, CancellationToken ct) =>
        BundleResult(await gameContent.GetVersionBundleAsync(versionId, ct));

    // Registers the session when play starts and returns the solver it must use
    [HttpPost("sessions")]
    public async Task<ActionResult<StartSessionResponse>> StartSession(StartSessionRequest request, CancellationToken ct) =>
        Ok(await gameSessions.StartAsync(request, ct));

    // End-of-session upload: session result, stats, events and re-plan results
    [HttpPut("sessions/{sessionId:guid}")]
    [RequestSizeLimit(MaxUploadBytes)]
    public async Task<ActionResult<SessionUploadResponse>> UploadSession(Guid sessionId, SessionUpload upload, CancellationToken ct) =>
        Ok(await gameSessions.UploadAsync(sessionId, upload, ct));

    private IActionResult BundleResult(GameBundle bundle)
    {
        var etag = new EntityTagHeaderValue($"\"{bundle.Checksum}\"");
        Response.Headers.ETag = etag.ToString();
        // Cache it, but always ask whether it is still current
        Response.Headers.CacheControl = "no-cache";

        return Request.GetTypedHeaders().IfNoneMatch.Any(tag => tag.Equals(EntityTagHeaderValue.Any) || tag.Compare(etag, useStrongComparison: false))
            ? StatusCode(StatusCodes.Status304NotModified)
            : Content(bundle.Json, "application/json");
    }
}
