using System.Text;
using System.Text.Json;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Mappings;
using ShadowVale.Contracts.Game;
using ShadowVale.Contracts.Telemetry;
using ShadowVale.DAL.Entities;

namespace ShadowVale.BLL.Validators;

// Upload after the per-item checks: what to store, and how many items were dropped
public sealed record ValidatedUpload(
    SessionSource Source,
    SessionOutcome Outcome,
    string StatsJson,
    IReadOnlyList<TelemetryEventDto> Events,
    int RejectedEvents,
    IReadOnlyList<(CoordinationResultDto Result, CoordinationTask TaskType)> Results,
    int RejectedResults);

// Two tiers, because the game drops a batch on 400 and retries it on 5xx:
// - a broken batch (missing session fields, duplicate ids, over the limits, bad stats) -> 400 for the whole batch;
// - a bad item (unknown event type, time outside the session, oversized payload...) -> only that item is dropped.
public static class GameSessionValidator
{
    public const int MaxEvents = 5_000;
    public const int MaxResults = 2_000;
    public const int MaxEncounters = 200;
    public const int MaxCounterKeys = 200;
    public const int MaxPayloadBytes = 4_096;
    public const int MaxCodeLength = 64;

    // Events may be stamped slightly before the session starts (clock) and are queued a little after it ends
    private static readonly TimeSpan EarlyTolerance = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan LateTolerance = TimeSpan.FromMinutes(5);

    private static readonly HashSet<string> EventTypes = new(TelemetryEventTypes.All, StringComparer.Ordinal);

    public static SessionSource ValidateStart(StartSessionRequest request)
    {
        var errors = new Errors();
        errors.RequireId(request.SessionId, nameof(request.SessionId));
        errors.RequireId(request.InstallId, nameof(request.InstallId));
        var source = errors.Source(request.Source);
        errors.SessionFields(request.MapCode, request.ClientVersion, request.Platform, request.StartedAt);

        if (source == SessionSource.Human && request.RequestedVariant is not null)
            errors.Add(nameof(request.RequestedVariant), "Human sessions get their solver from the server; leave RequestedVariant empty.");
        if (source == SessionSource.Replay && string.IsNullOrWhiteSpace(request.RequestedVariant))
            errors.Add(nameof(request.RequestedVariant), "Replay sessions must say which solver configuration code to run.");

        errors.ThrowIfAny();
        return source;
    }

    public static ValidatedUpload ValidateUpload(Guid sessionId, SessionUpload upload)
    {
        var errors = new Errors();
        errors.RequireId(sessionId, "SessionId");
        errors.RequireId(upload.InstallId, nameof(upload.InstallId));
        var source = errors.Source(upload.Source);
        errors.SessionFields(upload.MapCode, upload.ClientVersion, upload.Platform, upload.StartedAt);

        var outcome = SessionOutcome.InProgress;
        if (!EnumParsing.TryParse(upload.Outcome, out outcome) || outcome == SessionOutcome.InProgress)
            errors.Add(nameof(upload.Outcome), "Outcome must be one of: Completed, Died, Quit, Crashed.");
        if (upload.EndedAt == default)
            errors.Add(nameof(upload.EndedAt), "EndedAt is required.");
        else if (upload.EndedAt < upload.StartedAt)
            errors.Add(nameof(upload.EndedAt), "EndedAt must not be before StartedAt.");

        // A JSON null inside a list is a broken batch, not a bad item
        var events = upload.Events ?? [];
        var results = upload.CoordinationResults ?? [];
        if (events.Contains(null!) || results.Contains(null!) || upload.Stats?.Encounters?.Contains(null!) == true)
        {
            errors.Add("Batch", "Lists must not contain null items.");
            errors.ThrowIfAny();
        }
        if (events.Count > MaxEvents)
            errors.Add(nameof(upload.Events), $"At most {MaxEvents} events per session.");
        if (results.Count > MaxResults)
            errors.Add(nameof(upload.CoordinationResults), $"At most {MaxResults} coordination results per session.");
        CheckIds(errors, events.Select(e => e.ClientEventId), $"{nameof(upload.Events)}.ClientEventId");
        CheckIds(errors, results.Select(r => r.Id), $"{nameof(upload.CoordinationResults)}.Id");

        var statsJson = upload.Stats is null ? null : CheckStats(errors, upload.Stats);
        if (upload.Stats is null)
            errors.Add(nameof(upload.Stats), "Stats is required.");

        errors.ThrowIfAny();

        var from = upload.StartedAt - EarlyTolerance;
        var to = upload.EndedAt + LateTolerance;

        var acceptedEvents = events.Where(e => IsValidEvent(e, from, to)).ToList();
        var acceptedResults = new List<(CoordinationResultDto, CoordinationTask)>();
        foreach (var result in results)
        {
            if (EnumParsing.TryParse<CoordinationTask>(result.TaskType, out var task) && IsValidResult(result, from, to))
                acceptedResults.Add((result, task));
        }

        return new ValidatedUpload(source, outcome, statsJson!, acceptedEvents, events.Count - acceptedEvents.Count,
            acceptedResults, results.Count - acceptedResults.Count);
    }

    private static bool IsValidEvent(TelemetryEventDto e, DateTimeOffset from, DateTimeOffset to) =>
        EventTypes.Contains(e.EventType)
        && e.OccurredAt >= from && e.OccurredAt <= to
        && (e.MapCode is null || e.MapCode.Length <= MaxCodeLength)
        && (e.PosX is null || float.IsFinite(e.PosX.Value))
        && (e.PosY is null || float.IsFinite(e.PosY.Value))
        && (e.Payload is null || Encoding.UTF8.GetByteCount(JsonSerializer.Serialize(e.Payload)) <= MaxPayloadBytes);

    private static bool IsValidResult(CoordinationResultDto r, DateTimeOffset from, DateTimeOffset to) =>
        !string.IsNullOrEmpty(r.Variant) && r.Variant.Length <= MaxCodeLength
        && r.TriggeredAt >= from && r.TriggeredAt <= to
        && r.NumAgents > 0 && r.NumNodes > 0 && r.NumQuboVars is null or >= 0
        && r.SolveLatencyMs >= 0 && double.IsFinite(r.SolveLatencyMs)
        && (r.ObjectiveValue is null || double.IsFinite(r.ObjectiveValue.Value))
        && (r.CoordinationScore is null || double.IsFinite(r.CoordinationScore.Value))
        && (r.SquadTag is null || r.SquadTag.Length <= 50)
        && (r.MapCode is null || r.MapCode.Length <= MaxCodeLength);

    private static void CheckIds(Errors errors, IEnumerable<Guid> ids, string field)
    {
        var seen = new HashSet<Guid>();
        foreach (var id in ids)
        {
            if (id == Guid.Empty)
            {
                errors.Add(field, "Ids must not be empty.");
                return;
            }
            if (!seen.Add(id))
            {
                errors.Add(field, $"Id '{id}' appears twice in the batch.");
                return;
            }
        }
    }

    // Returns the stats as stored: camelCase JSON, encounter times in UTC, canonical outcome names
    private static string? CheckStats(Errors errors, SessionStats stats)
    {
        CheckCounters(errors, stats.EventCounts, "Stats.EventCounts");
        CheckCounters(errors, stats.ShotsByWeapon, "Stats.ShotsByWeapon");
        CheckCounters(errors, stats.KillsByWeapon, "Stats.KillsByWeapon");
        if (stats.Takedowns < 0 || stats.WeaponKills < 0 || stats.TimesDetected < 0 || stats.EventsDropped < 0)
            errors.Add("Stats", "Counters must not be negative.");

        var encounters = stats.Encounters ?? [];
        if (encounters.Count > MaxEncounters)
            errors.Add("Stats.Encounters", $"At most {MaxEncounters} encounters per session.");

        var indexes = new HashSet<int>();
        var clean = new List<EncounterStats>();
        foreach (var e in encounters)
        {
            var field = $"Stats.Encounters[{e.Index}]";
            if (e.Index < 0 || !indexes.Add(e.Index))
                errors.Add(field, "Index must be unique and not negative.");
            if (!EnumParsing.TryParse<EncounterOutcome>(e.Outcome, out var outcome))
                errors.Add(field, $"Outcome must be one of: {string.Join(", ", Enum.GetNames<EncounterOutcome>())}.");
            if (e.StartedAt == default || e.EndedAt < e.StartedAt)
                errors.Add(field, "StartedAt is required and EndedAt must not be before it.");
            if (e.NumAgents < 0 || e.NumReplans < 0 || e.NumFallbacks < 0)
                errors.Add(field, "Counters must not be negative.");
            if (e.CoordinationScore is { } score && !double.IsFinite(score))
                errors.Add(field, "CoordinationScore must be a number.");

            clean.Add(new EncounterStats
            {
                Index = e.Index,
                Outcome = outcome.ToString(),
                StartedAt = e.StartedAt.ToUniversalTime(),
                EndedAt = e.EndedAt.ToUniversalTime(),
                NumAgents = e.NumAgents,
                NumReplans = e.NumReplans,
                NumFallbacks = e.NumFallbacks,
                CoordinationScore = e.CoordinationScore
            });
        }

        return JsonSerializer.Serialize(new SessionStats
        {
            EventCounts = stats.EventCounts ?? [],
            ShotsByWeapon = stats.ShotsByWeapon ?? [],
            KillsByWeapon = stats.KillsByWeapon ?? [],
            Takedowns = stats.Takedowns,
            WeaponKills = stats.WeaponKills,
            TimesDetected = stats.TimesDetected,
            EventsDropped = stats.EventsDropped,
            Encounters = clean.OrderBy(e => e.Index).ToList()
        }, JsonSerializerOptions.Web);
    }

    private static void CheckCounters(Errors errors, Dictionary<string, int>? counters, string field)
    {
        if (counters is null)
            return;
        if (counters.Count > MaxCounterKeys)
            errors.Add(field, $"At most {MaxCounterKeys} keys.");
        if (counters.Any(c => c.Value < 0 || c.Key.Length is 0 or > MaxCodeLength))
            errors.Add(field, $"Keys must be 1-{MaxCodeLength} characters and counts must not be negative.");
    }

    private sealed class Errors
    {
        private readonly Dictionary<string, List<string>> _errors = [];

        public void Add(string field, string message)
        {
            if (!_errors.TryGetValue(field, out var list))
                _errors[field] = list = [];
            list.Add(message);
        }

        public void RequireId(Guid id, string field)
        {
            if (id == Guid.Empty)
                Add(field, $"{field} is required.");
        }

        public SessionSource Source(string? value)
        {
            if (EnumParsing.TryParse<SessionSource>(value, out var source))
                return source;
            Add("Source", "Source must be 'human' or 'replay'.");
            return SessionSource.Human;
        }

        public void SessionFields(string? mapCode, string? clientVersion, string? platform, DateTimeOffset startedAt)
        {
            if (mapCode is { Length: > MaxCodeLength })
                Add("MapCode", $"MapCode must be at most {MaxCodeLength} characters.");
            if (clientVersion is { Length: > 50 })
                Add("ClientVersion", "ClientVersion must be at most 50 characters.");
            if (string.IsNullOrWhiteSpace(platform) || platform.Length > 20)
                Add("Platform", "Platform is required (at most 20 characters).");
            if (startedAt == default)
                Add("StartedAt", "StartedAt is required.");
        }

        public void ThrowIfAny()
        {
            if (_errors.Count > 0)
                throw new ValidationException(_errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));
        }
    }
}
