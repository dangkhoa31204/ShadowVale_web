using System.Text.Json;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Mappings;
using ShadowVale.BLL.Validators;
using ShadowVale.Contracts.Game;
using ShadowVale.Contracts.Telemetry;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services;

// Session registration (solver assignment) and the end-of-session telemetry upload.
// Both are idempotent: the game resends on network errors and 5xx, so a repeat must give the same answer and
// never store anything twice. Errors caused by the data are 4xx so the game stops resending.
public class GameSessionService(
    IGameSessionRepository sessions,
    ISolverConfigurationRepository solverConfigurations,
    IGameContentRepository content,
    TimeProvider time) : IGameSessionService
{
    public async Task<StartSessionResponse> StartAsync(StartSessionRequest request, CancellationToken ct = default)
    {
        var source = GameSessionValidator.ValidateStart(request);
        var configurations = await solverConfigurations.GetAllAsync(ct);
        var requested = source == SessionSource.Replay
            ? SolverAssignment.ForReplay(request.RequestedVariant!, configurations)
            : null;
        var contentVersionId = await KnownVersionAsync(request.ContentVersionId, ct);
        var now = time.GetUtcNow().UtcDateTime;

        var session = await DatabaseErrors.GuardAsync(() => sessions.InTransactionAsync(async () =>
        {
            var playerId = await sessions.UpsertPlayerAsync(request.InstallId, now, ct);

            var existing = await sessions.LockAsync(request.SessionId, ct);
            if (existing is null)
            {
                var assigned = requested ?? SolverAssignment.ForHuman(request.SessionId, configurations);
                await sessions.InsertIfMissingAsync(new GameSession
                {
                    Id = request.SessionId,
                    PlayerId = playerId,
                    ContentVersionId = contentVersionId,
                    SolverConfigurationId = assigned?.Id,
                    Source = source,
                    MapCode = request.MapCode,
                    StartedAt = request.StartedAt.UtcDateTime,
                    Outcome = SessionOutcome.InProgress,
                    ClientVersion = request.ClientVersion,
                    Platform = request.Platform
                }, ct);
                // Another request may have inserted it first: read whatever is stored now
                existing = await sessions.LockAsync(request.SessionId, ct)
                    ?? throw new InvalidOperationException($"Session {request.SessionId} vanished after insert.");
            }

            EnsureSameSession(existing, playerId, source);
            if (requested is not null && existing.SolverConfigurationId != requested.Id)
                throw new ConflictException("This session was already started with another solver configuration.");
            return existing;
        }, ct));

        var configuration = configurations.FirstOrDefault(c => c.Id == session.SolverConfigurationId);
        return new StartSessionResponse { Solver = configuration is null ? null : ToAssignedSolver(configuration) };
    }

    public async Task<SessionUploadResponse> UploadAsync(Guid sessionId, SessionUpload upload, CancellationToken ct = default)
    {
        var batch = GameSessionValidator.ValidateUpload(sessionId, upload);
        var configurations = await solverConfigurations.GetAllAsync(ct);
        var byCode = configurations.ToDictionary(c => c.Code, StringComparer.Ordinal);
        var contentVersionId = await KnownVersionAsync(upload.ContentVersionId, ct);
        var now = time.GetUtcNow().UtcDateTime;
        var endedAt = upload.EndedAt.UtcDateTime;

        return await DatabaseErrors.GuardAsync(() => sessions.InTransactionAsync(async () =>
        {
            var playerId = await sessions.UpsertPlayerAsync(upload.InstallId, now, ct);

            // Normally registered at start; created here when the game was offline then (no solver assigned)
            await sessions.InsertIfMissingAsync(new GameSession
            {
                Id = sessionId,
                PlayerId = playerId,
                ContentVersionId = contentVersionId,
                Source = batch.Source,
                MapCode = upload.MapCode,
                StartedAt = upload.StartedAt.UtcDateTime,
                EndedAt = endedAt,
                Outcome = batch.Outcome,
                ClientVersion = upload.ClientVersion,
                Platform = upload.Platform,
                Stats = batch.StatsJson
            }, ct);
            var session = await sessions.LockAsync(sessionId, ct)
                ?? throw new InvalidOperationException($"Session {sessionId} vanished after insert.");

            EnsureSameSession(session, playerId, batch.Source);
            if (session.Outcome != SessionOutcome.InProgress
                && (session.Outcome != batch.Outcome || session.EndedAt is not { } stored || !SameInstant(stored, endedAt)))
                throw new ConflictException("This session was already uploaded with a different end time or outcome.");

            session.EndedAt = endedAt;
            session.Outcome = batch.Outcome;
            session.MapCode = upload.MapCode ?? session.MapCode;
            session.Stats = batch.StatsJson;

            var response = new SessionUploadResponse();
            response.Events.Rejected = batch.RejectedEvents;
            response.CoordinationResults.Rejected = batch.RejectedResults;

            var storedEvents = await sessions.GetEventIdsAsync(sessionId, ct);
            var newEvents = batch.Events.Where(e => !storedEvents.Contains(e.ClientEventId)).ToList();
            sessions.AddEvents(newEvents.Select(e => new TelemetryEvent
            {
                SessionId = sessionId,
                ClientEventId = e.ClientEventId,
                EventType = e.EventType,
                MapCode = e.MapCode ?? session.MapCode,
                PosX = e.PosX,
                PosY = e.PosY,
                OccurredAt = e.OccurredAt.UtcDateTime,
                Payload = e.Payload is null ? "{}" : JsonSerializer.Serialize(e.Payload),
                ReceivedAt = now
            }));
            response.Events.Accepted = newEvents.Count;
            response.Events.Duplicate = batch.Events.Count - newEvents.Count;

            var sessionConfiguration = configurations.FirstOrDefault(c => c.Id == session.SolverConfigurationId);
            var storedResults = await sessions.GetExistingResultIdsAsync(batch.Results.Select(r => r.Result.Id).ToList(), ct);
            var newResults = new List<CoordinationResult>();
            foreach (var (result, taskType) in batch.Results)
            {
                if (storedResults.Contains(result.Id))
                {
                    response.CoordinationResults.Duplicate++;
                    continue;
                }

                var configuration = SolverAssignment.ForResult(result.Variant, sessionConfiguration, byCode);
                if (configuration is null)
                {
                    response.CoordinationResults.Rejected++;
                    continue;
                }

                newResults.Add(new CoordinationResult
                {
                    Id = result.Id,
                    SessionId = sessionId,
                    SolverConfigurationId = configuration.Id,
                    MapCode = result.MapCode ?? session.MapCode,
                    SquadTag = result.SquadTag,
                    TaskType = taskType,
                    NumAgents = result.NumAgents,
                    NumNodes = result.NumNodes,
                    NumQuboVars = result.NumQuboVars,
                    ObjectiveValue = result.ObjectiveValue,
                    SolveLatencyMs = result.SolveLatencyMs,
                    WithinBudget = result.WithinBudget,
                    UsedFallback = result.UsedFallback,
                    Assignment = result.Assignment is null ? null : JsonSerializer.Serialize(result.Assignment),
                    CoordinationScore = result.CoordinationScore,
                    TriggeredAt = result.TriggeredAt.UtcDateTime
                });
            }
            sessions.AddResults(newResults);
            response.CoordinationResults.Accepted = newResults.Count;

            await sessions.SaveChangesAsync(ct);
            return response;
        }, ct));
    }

    // Same session id from another install, or human vs replay mixed up: refuse (409, the game stops resending)
    private static void EnsureSameSession(GameSession session, Guid playerId, SessionSource source)
    {
        if (session.PlayerId != playerId)
            throw new ConflictException("This session id belongs to another install.");
        if (session.Source != source)
            throw new ConflictException($"This session was registered as '{session.Source.ToString().ToLowerInvariant()}'.");
    }

    // An unknown version (e.g. the game's built-in fallback bundle) is stored as null instead of failing the session
    private async Task<Guid?> KnownVersionAsync(Guid? versionId, CancellationToken ct) =>
        versionId is { } id && await content.VersionExistsAsync(id, ct) ? id : null;

    // Postgres keeps microseconds, .NET keeps 100 ns ticks
    private static bool SameInstant(DateTime a, DateTime b) => Math.Abs((a - b).Ticks) < TimeSpan.TicksPerMillisecond;

    private static AssignedSolver ToAssignedSolver(SolverConfiguration configuration) => new()
    {
        ConfigurationId = configuration.Id,
        Code = configuration.Code,
        Variant = configuration.Algorithm.Variant(),
        Params = JsonSerializer.Deserialize<Dictionary<string, object?>>(configuration.Params) ?? [],
        QuboWeights = new Dictionary<string, double>(SolverParamsValidator.ParseWeights(configuration.QuboWeights)),
        TimeBudgetMs = configuration.TimeBudgetMs
    };
}
