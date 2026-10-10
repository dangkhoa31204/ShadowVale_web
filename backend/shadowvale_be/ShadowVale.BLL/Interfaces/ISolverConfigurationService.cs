using ShadowVale.BLL.DTOs.Solvers;

namespace ShadowVale.BLL.Interfaces;

public interface ISolverConfigurationService
{
    Task<IReadOnlyList<SolverConfigurationDto>> GetAllAsync(SolverConfigurationQuery query, CancellationToken ct = default);
    Task<SolverConfigurationDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<SolverConfigurationDto> CreateAsync(CreateSolverConfigurationRequest request, CancellationToken ct = default);
    Task<SolverConfigurationDto> UpdateAsync(Guid id, UpdateSolverConfigurationRequest request, CancellationToken ct = default);
    Task<SolverConfigurationDto> CloneAsync(Guid id, CloneSolverConfigurationRequest request, CancellationToken ct = default);
    Task<SolverConfigurationDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
