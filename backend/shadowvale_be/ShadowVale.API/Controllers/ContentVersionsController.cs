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
    public async Task<ActionResult<PagedResult<ContentVersionDto>>> Search(
        [FromQuery] ContentVersionQuery query, CancellationToken ct) => Respond(await service.SearchAsync(query, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ContentVersionDetailsDto>> GetById(Guid id, CancellationToken ct) =>
        Respond(await service.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<ContentVersionDto>> Create(CreateContentVersionRequest request, CancellationToken ct)
    {
        var version = await service.CreateAsync(request, User.GetUserId(), ct);
        if (version.Error is not null) return ErrorResponse(version.Error);
        return CreatedAtAction(nameof(GetById), new { id = version.Data!.Id }, version.Data);
    }

    [HttpGet("{id:guid}/compare")]
    public async Task<ActionResult<ContentComparisonDto>> Compare(Guid id,
        [FromQuery, System.ComponentModel.DataAnnotations.Required] Guid? targetId,
        CancellationToken ct) => Respond(await service.CompareAsync(id, targetId.GetValueOrDefault(), ct));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ContentVersionDto>> Update(Guid id, UpdateContentVersionRequest request,
        CancellationToken ct) => Respond(await service.UpdateAsync(id, request, ct));

    [HttpPost("{id:guid}/validate")]
    public async Task<ActionResult<ContentValidationResultDto>> Validate(Guid id,
        ValidateContentVersionRequest request, CancellationToken ct) => Respond(await service.ValidateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromBody] DeleteContentVersionRequest request,
        CancellationToken ct)
    {
        var result = await service.DeleteAsync(id, request, ct);
        if (result.Error is not null) return ErrorResponse(result.Error);
        return NoContent();
    }
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
