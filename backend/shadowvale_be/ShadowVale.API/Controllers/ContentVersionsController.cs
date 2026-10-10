using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShadowVale.API.Extensions;
using ShadowVale.BLL.Constants;
using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.Interfaces;

namespace ShadowVale.API.Controllers;

[ApiController]
[Route("api/content-versions")]
[Authorize(Roles = AppRoles.Admin + "," + AppRoles.Designer)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
[ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
public class ContentVersionsController(IContentVersionService service) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("GET /api/content-versions (ADMIN)")]
    [EndpointDescription("Available to both Admin and Designer. Lists version metadata with search, status filtering, and pagination.")]
    public async Task<ActionResult<PagedResult<ContentVersionDto>>> Search(
        [FromQuery] ContentVersionQuery query, CancellationToken ct) => Respond(await service.SearchAsync(query, ct));

    [HttpGet("{id:guid}")]
    [EndpointSummary("GET /api/content-versions/{id} (ADMIN)")]
    [EndpointDescription("Available to both Admin and Designer. Returns version metadata (including status and current revision) and the full content bundle, including weapon stats. Use this revision for validate/submit/review actions.")]
    public async Task<ActionResult<ContentVersionDetailsDto>> GetById(Guid id, CancellationToken ct) =>
        Respond(await service.GetByIdAsync(id, ct));

    [HttpPost]
    [EndpointSummary("POST /api/content-versions (DESIGNER)")]
    [EndpointDescription("Available to both Designer and Admin. Creates an empty Draft or clones all content when parentVersionId is provided. Returns version metadata; weapon editing is a separate operation.")]
    public async Task<ActionResult<ContentVersionDto>> Create(CreateContentVersionRequest request, CancellationToken ct)
    {
        var version = await service.CreateAsync(request, User.GetUserId(), ct);
        if (version.Error is not null) return ErrorResponse(version.Error);
        return CreatedAtAction(nameof(GetById), new { id = version.Data!.Id }, version.Data);
    }

    [HttpGet("{id:guid}/compare")]
    [EndpointSummary("GET /api/content-versions/{id}/compare (ADMIN)")]
    [EndpointDescription("Available to both Admin and Designer. Compares the source version identified by id with the target version identified by targetId; returns before/after differences.")]
    public async Task<ActionResult<ContentComparisonDto>> Compare(Guid id,
        [FromQuery, System.ComponentModel.DataAnnotations.Required] Guid? targetId,
        CancellationToken ct) => Respond(await service.CompareAsync(id, targetId.GetValueOrDefault(), ct));

    [HttpPut("{id:guid}")]
    [EndpointSummary("PUT /api/content-versions/{id} (ADMIN)")]
    [EndpointDescription("Available to both Designer and Admin. Updates label, changelog, and schemaVersion only; requires Draft status and current revision. Does not update weapon stats.")]
    public async Task<ActionResult<ContentVersionDto>> Update(Guid id, UpdateContentVersionRequest request,
        CancellationToken ct) => Respond(await service.UpdateAsync(id, request, ct));

    [HttpPost("{id:guid}/validate")]
    [EndpointSummary("POST /api/content-versions/{id}/validate (ADMIN)")]
    [EndpointDescription("Available to both Designer and Admin. Validates the complete Draft snapshot and returns isValid, errors, and the incremented revision. Does not submit the version for review.")]
    public async Task<ActionResult<ContentValidationResultDto>> Validate(Guid id,
        ValidateContentVersionRequest request, CancellationToken ct) => Respond(await service.ValidateAsync(id, request, ct));

    [HttpPost("{id:guid}/submit")]
    [EndpointSummary("POST /api/content-versions/{id}/submit (DESIGNER)")]
    [EndpointDescription("Available to both Designer and Admin. Requires Draft status, the current revision, and an unchanged validated bundle/checksum. Revalidates the bundle, sets InReview and submittedAt, and returns the incremented revision. Submitted content is locked for editing.")]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ContentVersionDto>> Submit(Guid id, SubmitContentVersionRequest request,
        CancellationToken ct) => Respond(await service.SubmitAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [EndpointSummary("DELETE /api/content-versions/{id} (ADMIN)")]
    [EndpointDescription("Available to both Designer and Admin. Soft-deletes a Draft by setting Archived; preserves its content. Requires the current revision.")]
    public async Task<IActionResult> Delete(Guid id, [FromBody] DeleteContentVersionRequest request,
        CancellationToken ct)
    {
        var result = await service.DeleteAsync(id, request, ct);
        if (result.Error is not null) return ErrorResponse(result.Error);
        return NoContent();
    }
    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = AppRoles.Admin)]
    [EndpointSummary("POST /api/content-versions/{id}/approve (ADMIN)")]
    [EndpointDescription("Approves an InReview version after checking its validated bundle; returns Approved status and the incremented revision.")]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ContentVersionDto>> Approve(Guid id, ReviewContentVersionRequest request,
        CancellationToken ct) => Respond(await service.ApproveAsync(id, request, User.GetUserId(), ct));

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = AppRoles.Admin)]
    [EndpointSummary("POST /api/content-versions/{id}/reject (ADMIN)")]
    [EndpointDescription("Rejects an InReview version with a required reviewNote; returns Rejected status and the incremented revision.")]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ContentVersionDto>> Reject(Guid id, ReviewContentVersionRequest request,
        CancellationToken ct) => Respond(await service.RejectAsync(id, request, User.GetUserId(), ct));

    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = AppRoles.Admin)]
    [EndpointSummary("POST /api/content-versions/{id}/publish (ADMIN)")]
    [EndpointDescription("Publishes an Approved version, archives the previous Published version, and records publication history in one transaction.")]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ContentVersionDto>> Publish(Guid id, PublishContentVersionRequest request,
        CancellationToken ct) => Respond(await service.PublishAsync(id, request, User.GetUserId(), ct));

    [HttpGet("/api/content-publications")]
    [Authorize(Roles = AppRoles.Admin)]
    [EndpointSummary("GET /api/content-publications (ADMIN)")]
    [EndpointDescription("Lists publication history with optional contentVersionId filtering and pagination.")]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<ContentPublicationDto>>> Publications(
        [FromQuery] ContentPublicationQuery query, CancellationToken ct) =>
        Respond(await service.SearchPublicationsAsync(query, ct));

    private ActionResult<T> Respond<T>(ServiceResult<T> result) =>
        result.Error is not null ? ErrorResponse(result.Error) : Ok(result.Data);

    private ObjectResult ErrorResponse(ServiceError error)
    {
        var status = error.Kind switch
        {
            ServiceErrorKind.Validation => 400,
            ServiceErrorKind.NotFound => 404,
            _ => 409
        };
        var problem = new ProblemDetails
        {
            Status = status, Title = status switch { 400 => "Validation failed", 404 => "Not found", _ => "Conflict" },
            Detail = error.Message, Instance = Request.Path
        };
        problem.Extensions["code"] = error.Code;
        problem.Extensions["message"] = error.Message;
        problem.Extensions["traceId"] = HttpContext.TraceIdentifier;
        if (error.Errors is not null) problem.Extensions["errors"] = error.Errors;
        var response = new ObjectResult(problem) { StatusCode = status };
        response.ContentTypes.Add("application/problem+json");
        return response;
    }
}
