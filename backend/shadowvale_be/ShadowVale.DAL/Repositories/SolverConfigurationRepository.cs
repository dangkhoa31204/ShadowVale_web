using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.DAL.Repositories;

public class SolverConfigurationRepository(ShadowValeDbContext context)
    : GenericRepository<SolverConfiguration>(context), ISolverConfigurationRepository
{
    public Task<List<SolverConfigurationUsage>> SearchAsync(
        SolverFamily? family, SolverAlgorithm? algorithm, bool? isActive, CancellationToken ct = default)
    {
        var query = DbSet.AsNoTracking();

        if (family is not null)
            query = query.Where(s => s.Family == family);
        if (algorithm is not null)
            query = query.Where(s => s.Algorithm == algorithm);
        if (isActive is not null)
            query = query.Where(s => s.IsActive == isActive);

        return WithUsage(query.OrderBy(s => s.Code)).ToListAsync(ct);
    }

    public Task<SolverConfigurationUsage?> GetUsageAsync(Guid id, CancellationToken ct = default) =>
        WithUsage(DbSet.Where(s => s.Id == id)).FirstOrDefaultAsync(ct);

    public Task<bool> CodeExistsAsync(string code, CancellationToken ct = default) =>
        DbSet.AnyAsync(s => s.Code == code, ct);

    public Task<bool> AnyAsync(CancellationToken ct = default) => DbSet.AnyAsync(ct);

    public Task<List<SolverConfiguration>> GetActiveAsync(CancellationToken ct = default) =>
        DbSet.Where(s => s.IsActive).OrderBy(s => s.Code).ToListAsync(ct);

    public Task<SolverConfiguration?> GetByCodeAsync(string code, CancellationToken ct = default) =>
        DbSet.FirstOrDefaultAsync(s => s.Code == code, ct);

    private IQueryable<SolverConfigurationUsage> WithUsage(IQueryable<SolverConfiguration> query) =>
        query.Select(s => new SolverConfigurationUsage(
            s,
            Context.GameSessions.Count(g => g.SolverConfigurationId == s.Id),
            Context.CoordinationResults.Count(r => r.SolverConfigurationId == s.Id)));
}
