using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShadowVale.BLL.Constants;
using ShadowVale.BLL.DTOs.Solvers;
using ShadowVale.BLL.Interfaces;

namespace ShadowVale.API.Controllers;

// Every role can read; Admins and Analysts (who run the experiments) can change
[ApiController]
[Route("api/solver-configurations")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Analyst},{AppRoles.Designer}")]
public class SolverConfigurationsController(ISolverConfigurationService solverConfigurations) : ControllerBase
{
    private const string Editors = $"{AppRoles.Admin},{AppRoles.Analyst}";

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SolverConfigurationDto>>> GetAll([FromQuery] SolverConfigurationQuery query, CancellationToken ct) =>
        Ok(await solverConfigurations.GetAllAsync(query, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SolverConfigurationDto>> GetById(Guid id, CancellationToken ct) =>
        Ok(await solverConfigurations.GetByIdAsync(id, ct));

    // Created inactive; switch it on with PATCH {id}/active
    [HttpPost]
    [Authorize(Roles = Editors)]
    public async Task<ActionResult<SolverConfigurationDto>> Create(CreateSolverConfigurationRequest request, CancellationToken ct)
    {
        var configuration = await solverConfigurations.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = configuration.Id }, configuration);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = Editors)]
    public async Task<ActionResult<SolverConfigurationDto>> Update(Guid id, UpdateSolverConfigurationRequest request, CancellationToken ct) =>
        Ok(await solverConfigurations.UpdateAsync(id, request, ct));

    [HttpPost("{id:guid}/clone")]
    [Authorize(Roles = Editors)]
    public async Task<ActionResult<SolverConfigurationDto>> Clone(Guid id, CloneSolverConfigurationRequest request, CancellationToken ct)
    {
        var configuration = await solverConfigurations.CloneAsync(id, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = configuration.Id }, configuration);
    }

    [HttpPatch("{id:guid}/active")]
    [Authorize(Roles = Editors)]
    public async Task<ActionResult<SolverConfigurationDto>> SetActive(Guid id, SetSolverConfigurationActiveRequest request, CancellationToken ct) =>
        Ok(await solverConfigurations.SetActiveAsync(id, request.IsActive, ct));

    // Only for configurations never used by a session or result
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Editors)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await solverConfigurations.DeleteAsync(id, ct);
        return NoContent();
    }
}
