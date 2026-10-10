using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.DAL.Repositories;

public class DemoDataRepository(ShadowValeDbContext context) : IDemoDataRepository
{
    public Task<bool> HasSessionsOtherThanAsync(string clientVersionMarker, CancellationToken ct = default) =>
        context.GameSessions.AnyAsync(s => s.ClientVersion == null || s.ClientVersion != clientVersionMarker, ct);

    // Events and results go with their session (cascade)
    public Task<int> DeleteSessionsAsync(string clientVersionMarker, CancellationToken ct = default) =>
        context.GameSessions.Where(s => s.ClientVersion == clientVersionMarker).ExecuteDeleteAsync(ct);

    public Task<Guid?> GetAnyUserIdAsync(CancellationToken ct = default) =>
        context.Users.OrderBy(u => u.CreatedAt).Select(u => (Guid?)u.Id).FirstOrDefaultAsync(ct);

    public Task<bool> AnyVersionEverPublishedAsync(CancellationToken ct = default) =>
        context.ContentVersions.AnyAsync(v => v.PublishedAt != null, ct);

    public Task<Guid?> GetPublishedVersionIdAsync(CancellationToken ct = default) =>
        context.ContentVersions.Where(v => v.Status == ContentStatus.Published).Select(v => (Guid?)v.Id).FirstOrDefaultAsync(ct);

    public Task<Dictionary<Guid, Guid>> GetPlayerIdsByInstallAsync(IReadOnlyCollection<Guid> installIds, CancellationToken ct = default) =>
        context.Players.Where(p => installIds.Contains(p.InstallId)).ToDictionaryAsync(p => p.InstallId, p => p.Id, ct);

    public void Add(object entity) => context.Add(entity);

    public void AddRange(IEnumerable<object> entities) => context.AddRange(entities);

    public Task SaveChangesAsync(CancellationToken ct = default) => context.SaveChangesAsync(ct);
}
