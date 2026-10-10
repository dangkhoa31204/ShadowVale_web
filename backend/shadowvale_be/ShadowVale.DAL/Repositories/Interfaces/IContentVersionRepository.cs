using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Repositories.Interfaces;

public interface IContentVersionRepository : IGenericRepository<ContentVersion>
{
    Task<(List<ContentVersion> Items, int Total)> SearchAsync(string? search, ContentStatus? status,
        int page, int pageSize, CancellationToken ct = default);
    Task<ContentVersion?> GetSnapshotAsync(Guid id, CancellationToken ct = default);
    void AddContent(IEnumerable<BaseEntity> entities);
    Task PublishAsync(ContentVersion version, Guid actorId, string reason, DateTime publishedAt, CancellationToken ct = default);
    Task<(List<ContentPublicationHistory> Items, int Total)> SearchPublicationsAsync(Guid? versionId,
        int page, int pageSize, CancellationToken ct = default);
}
