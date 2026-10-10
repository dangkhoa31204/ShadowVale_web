using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Repositories.Interfaces;

// Development-only fake telemetry, marked by GameSession.ClientVersion so it can be told apart and removed
public interface IDemoDataRepository
{
    Task<bool> HasSessionsOtherThanAsync(string clientVersionMarker, CancellationToken ct = default);

    // Removes the marked sessions with their events and results
    Task<int> DeleteSessionsAsync(string clientVersionMarker, CancellationToken ct = default);

    Task<Guid?> GetAnyUserIdAsync(CancellationToken ct = default);
    Task<bool> AnyVersionEverPublishedAsync(CancellationToken ct = default);
    Task<Guid?> GetPublishedVersionIdAsync(CancellationToken ct = default);
    Task<Dictionary<Guid, Guid>> GetPlayerIdsByInstallAsync(IReadOnlyCollection<Guid> installIds, CancellationToken ct = default);

    void Add(object entity);
    void AddRange(IEnumerable<object> entities);
    Task SaveChangesAsync(CancellationToken ct = default);
}
