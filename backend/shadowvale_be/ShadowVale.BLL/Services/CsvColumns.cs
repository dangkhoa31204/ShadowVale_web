using ShadowVale.DAL.Queries;

namespace ShadowVale.BLL.Services;

// Column layout of each CSV export (snake_case headers, one row per record)
public static class CsvColumns
{
    public static readonly IReadOnlyList<CsvColumn<SessionExportRow>> Sessions =
    [
        new("session_id", r => r.SessionId),
        new("player_id", r => r.PlayerId),
        new("source", r => r.Source, Text: true),
        new("content_version_id", r => r.ContentVersionId),
        new("content_version_label", r => r.ContentVersionLabel, Text: true),
        new("map_code", r => r.MapCode, Text: true),
        new("solver_code", r => r.SolverCode, Text: true),
        new("solver_family", r => r.SolverFamily, Text: true),
        new("started_at", r => r.StartedAt),
        new("ended_at", r => r.EndedAt),
        new("duration_seconds", r => r.DurationSeconds),
        new("outcome", r => r.Outcome, Text: true),
        new("client_version", r => r.ClientVersion, Text: true),
        new("platform", r => r.Platform, Text: true),
        new("takedowns", r => r.Takedowns),
        new("weapon_kills", r => r.WeaponKills),
        new("times_detected", r => r.TimesDetected),
        new("events_dropped", r => r.EventsDropped),
        new("encounters", r => r.Encounters)
    ];

    public static readonly IReadOnlyList<CsvColumn<EventExportRow>> Events =
    [
        new("session_id", r => r.SessionId),
        new("client_event_id", r => r.ClientEventId),
        new("event_type", r => r.EventType, Text: true),
        new("map_code", r => r.MapCode, Text: true),
        new("pos_x", r => r.PosX),
        new("pos_y", r => r.PosY),
        new("occurred_at", r => r.OccurredAt),
        new("payload", r => r.Payload, Text: true)
    ];

    public static readonly IReadOnlyList<CsvColumn<EncounterExportRow>> Encounters =
    [
        new("session_id", r => r.SessionId),
        new("source", r => r.Source, Text: true),
        new("content_version_id", r => r.ContentVersionId),
        new("solver_code", r => r.SolverCode, Text: true),
        new("solver_family", r => r.SolverFamily, Text: true),
        new("encounter_index", r => r.EncounterIndex),
        new("outcome", r => r.Outcome, Text: true),
        new("started_at", r => r.StartedAt),
        new("ended_at", r => r.EndedAt),
        new("duration_seconds", r => r.DurationSeconds),
        new("num_agents", r => r.NumAgents),
        new("num_replans", r => r.NumReplans),
        new("num_fallbacks", r => r.NumFallbacks),
        new("coordination_score", r => r.CoordinationScore)
    ];

    public static readonly IReadOnlyList<CsvColumn<ResultExportRow>> Results =
    [
        new("result_id", r => r.ResultId),
        new("session_id", r => r.SessionId),
        new("source", r => r.Source, Text: true),
        new("content_version_id", r => r.ContentVersionId),
        new("assigned_solver_code", r => r.AssignedSolverCode, Text: true),
        new("solver_code", r => r.SolverCode, Text: true),
        new("solver_family", r => r.SolverFamily, Text: true),
        new("task_type", r => r.TaskType, Text: true),
        new("map_code", r => r.MapCode, Text: true),
        new("squad_tag", r => r.SquadTag, Text: true),
        new("num_agents", r => r.NumAgents),
        new("num_nodes", r => r.NumNodes),
        new("num_qubo_vars", r => r.NumQuboVars),
        new("objective_value", r => r.ObjectiveValue),
        new("solve_latency_ms", r => r.SolveLatencyMs),
        new("within_budget", r => r.WithinBudget),
        new("used_fallback", r => r.UsedFallback),
        new("coordination_score", r => r.CoordinationScore),
        new("triggered_at", r => r.TriggeredAt)
    ];
}
