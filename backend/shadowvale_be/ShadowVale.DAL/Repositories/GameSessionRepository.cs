using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.DAL.Repositories;

public class GameSessionRepository(ShadowValeDbContext context) : IGameSessionRepository
{
    public async Task<T> InTransactionAsync<T>(Func<Task<T>> work, CancellationToken ct = default)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(ct);
        var result = await work();
        await transaction.CommitAsync(ct);
        return result;
    }

    public async Task<Guid> UpsertPlayerAsync(Guid installId, DateTime seenAt, CancellationToken ct = default)
    {
        // DO UPDATE (not DO NOTHING) so RETURNING also yields the id of an existing player, and the row gets locked
        var ids = await context.Database.SqlQuery<Guid>($"""
            INSERT INTO shadowvale.players (id, install_id, last_seen_at, created_at, updated_at)
            VALUES ({Guid.CreateVersion7()}, {installId}, {seenAt}, {seenAt}, {seenAt})
            ON CONFLICT (install_id) DO UPDATE
                SET last_seen_at = GREATEST(players.last_seen_at, EXCLUDED.last_seen_at),
                    updated_at = EXCLUDED.updated_at
            RETURNING id AS "Value"
            """).ToListAsync(ct);
        return ids.Single();
    }

    public Task InsertIfMissingAsync(GameSession session, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var source = session.Source.ToString().ToLowerInvariant();
        var outcome = session.Outcome.ToString();
        // Nullable parameters carry no type, so they are cast to the column type
        return context.Database.ExecuteSqlAsync($"""
            INSERT INTO shadowvale.game_sessions
                (id, player_id, content_version_id, solver_configuration_id, source, map_code, started_at, ended_at,
                 outcome, client_version, platform, stats, created_at, updated_at)
            VALUES ({session.Id}, {session.PlayerId}::uuid, {session.ContentVersionId}::uuid, {session.SolverConfigurationId}::uuid,
                    {source}, {session.MapCode}::varchar, {session.StartedAt}, {session.EndedAt}::timestamptz,
                    {outcome}, {session.ClientVersion}::varchar, {session.Platform}, {session.Stats}::jsonb, {now}, {now})
            ON CONFLICT (id) DO NOTHING
            """, ct);
    }

    public async Task<GameSession?> LockAsync(Guid sessionId, CancellationToken ct = default)
    {
        // ToListAsync keeps the SQL as written (FirstOrDefault would wrap it in a subquery)
        var sessions = await context.GameSessions
            .FromSql($"SELECT * FROM shadowvale.game_sessions WHERE id = {sessionId} FOR UPDATE")
            .ToListAsync(ct);
        return sessions.SingleOrDefault();
    }

    public async Task<HashSet<Guid>> GetEventIdsAsync(Guid sessionId, CancellationToken ct = default) =>
        (await context.TelemetryEvents.Where(e => e.SessionId == sessionId).Select(e => e.ClientEventId).ToListAsync(ct)).ToHashSet();

    public async Task<HashSet<Guid>> GetExistingResultIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct = default) =>
        ids.Count == 0
            ? []
            : (await context.CoordinationResults.Where(r => ids.Contains(r.Id)).Select(r => r.Id).ToListAsync(ct)).ToHashSet();

    public void AddEvents(IEnumerable<TelemetryEvent> events) => context.TelemetryEvents.AddRange(events);

    public void AddResults(IEnumerable<CoordinationResult> results) => context.CoordinationResults.AddRange(results);

    public Task SaveChangesAsync(CancellationToken ct = default) => context.SaveChangesAsync(ct);
}
