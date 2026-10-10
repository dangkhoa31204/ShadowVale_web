using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShadowVale.API.Extensions;
using ShadowVale.BLL.Constants;
using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.Interfaces;

namespace ShadowVale.API.Controllers;

// Content versions and the review / publish workflow. Every role can look (the Analyst filters dashboards by version);
// Designers (and Admins) author and submit; only Admins approve, reject, publish and roll back.
[ApiController]
[Route("api/content/versions")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Designer},{AppRoles.Analyst}")]
public class ContentVersionsController(IContentVersionService versions) : ControllerBase
{
    private const string Authors = $"{AppRoles.Admin},{AppRoles.Designer}";

    [HttpGet]
    public async Task<ActionResult<PagedResult<ContentVersionDto>>> GetAll([FromQuery] ContentVersionQuery query, CancellationToken ct) =>
        Ok(await versions.GetAllAsync(query, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ContentVersionDto>> GetById(Guid id, CancellationToken ct) =>
        Ok(await versions.GetByIdAsync(id, ct));

    // Publish / rollback log, newest first
    [HttpGet("history")]
    public async Task<ActionResult<PagedResult<PublicationHistoryDto>>> GetHistory([FromQuery] HistoryQuery query, CancellationToken ct) =>
        Ok(await versions.GetHistoryAsync(query, ct));

    // What changed going from version a to version b, per section (added / removed / changed rows by code)
    [HttpGet("compare")]
    public async Task<ActionResult<ContentCompareDto>> Compare([FromQuery] Guid a, [FromQuery] Guid b, CancellationToken ct) =>
        Ok(await versions.CompareAsync(a, b, ct));

    // New version as a Draft: empty, or a copy of BaseVersionId (usually the published one) to edit from
    [HttpPost]
    [Authorize(Roles = Authors)]
    public async Task<ActionResult<ContentVersionDto>> Create(CreateContentVersionRequest request, CancellationToken ct)
    {
        var version = await versions.CreateAsync(request, User.GetUserId(), ct);
        return CreatedAtAction(nameof(GetById), new { id = version.Id }, version);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = Authors)]
    public async Task<ActionResult<ContentVersionDto>> Update(Guid id, UpdateContentVersionRequest request, CancellationToken ct) =>
        Ok(await versions.UpdateAsync(id, request, ct));

    // Only a Draft or Rejected version
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Authors)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await versions.DeleteAsync(id, ct);
        return NoContent();
    }

    // Builds the bundle and checks all content. Always 200 with the list of problems (empty when valid).
    [HttpPost("{id:guid}/validate")]
    [Authorize(Roles = Authors)]
    public async Task<ActionResult<ValidationReportDto>> Validate(Guid id, CancellationToken ct) =>
        Ok(await versions.ValidateAsync(id, ct));

    // The validated bundle as the game receives it
    [HttpGet("{id:guid}/bundle")]
    [Authorize(Roles = Authors)]
    [Produces("application/json")]
    public async Task<ContentResult> GetBundle(Guid id, CancellationToken ct) =>
        Content(await versions.GetBundleAsync(id, ct), "application/json");

    // Draft / Rejected -> InReview (400 with the problems when the content does not validate)
    [HttpPost("{id:guid}/submit")]
    [Authorize(Roles = Authors)]
    public async Task<ActionResult<ContentVersionDto>> Submit(Guid id, CancellationToken ct) =>
        Ok(await versions.SubmitAsync(id, ct));

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<ContentVersionDto>> Approve(Guid id, ReviewNoteRequest request, CancellationToken ct) =>
        Ok(await versions.ApproveAsync(id, User.GetUserId(), request, ct));

    // The designer edits it again (it goes back to Draft) and submits again
    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<ContentVersionDto>> Reject(Guid id, RejectContentVersionRequest request, CancellationToken ct) =>
        Ok(await versions.RejectAsync(id, User.GetUserId(), request, ct));

    // Approved -> Published; the previously published version is archived. The game gets the new bundle on its next start.
    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<ContentVersionDto>> Publish(Guid id, PublishContentVersionRequest request, CancellationToken ct) =>
        Ok(await versions.PublishAsync(id, User.GetUserId(), request, ct));

    // Archived -> Published again (the current one is archived)
    [HttpPost("{id:guid}/rollback")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<ContentVersionDto>> Rollback(Guid id, RollbackContentVersionRequest request, CancellationToken ct) =>
        Ok(await versions.RollbackAsync(id, User.GetUserId(), request, ct));
}
