using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Repositories.Interfaces;

// Writes from the game. Every write runs inside InTransactionAsync and locks rows in the same order
// (player, then session), so concurrent or retried requests for one session run one after the other.
public interface IGameSessionRepository
{
    Task<T> InTransactionAsync<T>(Func<Task<T>> work, CancellationToken ct = default);

    // Creates the player on first contact, otherwise bumps LastSeenAt. Locks the player row.
    Task<Guid> UpsertPlayerAsync(Guid installId, DateTime seenAt, CancellationToken ct = default);

    // Inserts the session unless a session with the same id already exists (then does nothing)
    Task InsertIfMissingAsync(GameSession session, CancellationToken ct = default);

    // Locks the session row until the transaction ends; the returned entity is tracked
    Task<GameSession?> LockAsync(Guid sessionId, CancellationToken ct = default);

    Task<HashSet<Guid>> GetEventIdsAsync(Guid sessionId, CancellationToken ct = default);

    // Result ids are global primary keys, so look them up everywhere, not only in this session
    Task<HashSet<Guid>> GetExistingResultIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct = default);

    void AddEvents(IEnumerable<TelemetryEvent> events);
    void AddResults(IEnumerable<CoordinationResult> results);
    Task SaveChangesAsync(CancellationToken ct = default);
}
