using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Repositories.Interfaces;

// How often a configuration was used: assigned to sessions, and referenced by re-plan results
public sealed record SolverConfigurationUsage(SolverConfiguration Configuration, int SessionCount, int ResultCount)
{
    public bool IsUsed => SessionCount > 0 || ResultCount > 0;
}

public interface ISolverConfigurationRepository : IGenericRepository<SolverConfiguration>
{
    Task<List<SolverConfigurationUsage>> SearchAsync(
        SolverFamily? family, SolverAlgorithm? algorithm, bool? isActive, CancellationToken ct = default);

    Task<SolverConfigurationUsage?> GetUsageAsync(Guid id, CancellationToken ct = default);
    Task<bool> CodeExistsAsync(string code, CancellationToken ct = default);
    Task<bool> AnyAsync(CancellationToken ct = default);

    // Tracked, so the caller can change them before SaveChangesAsync
    Task<List<SolverConfiguration>> GetActiveAsync(CancellationToken ct = default);
    Task<SolverConfiguration?> GetByCodeAsync(string code, CancellationToken ct = default);
}
