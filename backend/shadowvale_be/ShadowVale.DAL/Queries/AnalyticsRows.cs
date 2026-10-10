using System.ComponentModel.DataAnnotations.Schema;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Queries;

// Session filter shared by every analytics query. Source is always set: human play and replay runs are never mixed.
public sealed record AnalyticsFilter(
    SessionSource Source,
    Guid? ContentVersionId = null,
    string? MapCode = null,
    DateTime? From = null,
    DateTime? To = null,
    Guid? SolverConfigurationId = null,
    SolverFamily? Family = null);

// Rows of the raw analytics SQL. Column names are explicit so they do not depend on the naming convention.

public sealed record OverviewRow(
    [property: Column("sessions")] long Sessions,
    [property: Column("players")] long Players,
    [property: Column("unfinished")] long Unfinished,
    [property: Column("avg_duration_seconds")] double? AvgDurationSeconds,
    [property: Column("median_duration_seconds")] double? MedianDurationSeconds);

public sealed record KeyCountRow(
    [property: Column("key")] string Key,
    [property: Column("count")] long Count);

public sealed record DayCountRow(
    [property: Column("day")] DateOnly Day,
    [property: Column("count")] long Count);

public sealed record HeatCellRow(
    [property: Column("x")] double X,
    [property: Column("y")] double Y,
    [property: Column("count")] long Count);

public sealed record FunnelStepRow(
    [property: Column("step")] int Step,
    [property: Column("sessions")] long Sessions);

public sealed record WeaponRow(
    [property: Column("weapon")] string Weapon,
    [property: Column("shots")] long Shots,
    [property: Column("kills")] long Kills,
    [property: Column("sessions_used")] long SessionsUsed);

public sealed record PlaystyleRow(
    [property: Column("sessions")] long Sessions,
    [property: Column("sessions_without_kills")] long SessionsWithoutKills,
    [property: Column("avg_stealth_ratio")] double? AvgStealthRatio,
    [property: Column("median_stealth_ratio")] double? MedianStealthRatio,
    [property: Column("avg_times_detected")] double? AvgTimesDetected,
    [property: Column("median_times_detected")] double? MedianTimesDetected);

public sealed record BucketRow(
    [property: Column("bucket")] int Bucket,
    [property: Column("count")] long Count);

// Encounter outcomes (from session stats) per content version and solver group
public sealed record EncounterMetricsRow(
    [property: Column("content_version_id")] Guid? ContentVersionId,
    [property: Column("content_version_label")] string? ContentVersionLabel,
    [property: Column("group_key")] string GroupKey,
    [property: Column("group_label")] string GroupLabel,
    [property: Column("family")] string Family,
    [property: Column("sessions")] long Sessions,
    [property: Column("encounters")] long Encounters,
    [property: Column("captures")] long Captures,
    [property: Column("escapes")] long Escapes,
    [property: Column("avg_escape_seconds")] double? AvgEscapeSeconds,
    [property: Column("median_escape_seconds")] double? MedianEscapeSeconds);

// Re-plan metrics (from coordination results) per content version and solver group
public sealed record ReplanMetricsRow(
    [property: Column("content_version_id")] Guid? ContentVersionId,
    [property: Column("content_version_label")] string? ContentVersionLabel,
    [property: Column("group_key")] string GroupKey,
    [property: Column("group_label")] string GroupLabel,
    [property: Column("family")] string Family,
    [property: Column("replans")] long Replans,
    [property: Column("avg_coordination_score")] double? AvgCoordinationScore,
    [property: Column("latency_p50")] double? LatencyP50,
    [property: Column("latency_p95")] double? LatencyP95,
    [property: Column("latency_p99")] double? LatencyP99,
    [property: Column("within_budget_rate")] double? WithinBudgetRate,
    [property: Column("fallback_rate")] double? FallbackRate);

public sealed record ScalabilityRow(
    [property: Column("configuration_id")] Guid ConfigurationId,
    [property: Column("code")] string Code,
    [property: Column("family")] string Family,
    [property: Column("num_agents")] int NumAgents,
    [property: Column("nodes_from")] int NodesFrom,
    [property: Column("replans")] long Replans,
    [property: Column("latency_p50")] double? LatencyP50,
    [property: Column("latency_p95")] double? LatencyP95,
    [property: Column("avg_objective")] double? AvgObjective,
    [property: Column("within_budget_rate")] double? WithinBudgetRate);

public sealed record SessionExportRow(
    [property: Column("session_id")] Guid SessionId,
    [property: Column("player_id")] Guid? PlayerId,
    [property: Column("source")] string Source,
    [property: Column("content_version_id")] Guid? ContentVersionId,
    [property: Column("content_version_label")] string? ContentVersionLabel,
    [property: Column("map_code")] string? MapCode,
    [property: Column("solver_code")] string? SolverCode,
    [property: Column("solver_family")] string? SolverFamily,
    [property: Column("started_at")] DateTime StartedAt,
    [property: Column("ended_at")] DateTime? EndedAt,
    [property: Column("duration_seconds")] double? DurationSeconds,
    [property: Column("outcome")] string Outcome,
    [property: Column("client_version")] string? ClientVersion,
    [property: Column("platform")] string Platform,
    [property: Column("takedowns")] int Takedowns,
    [property: Column("weapon_kills")] int WeaponKills,
    [property: Column("times_detected")] int TimesDetected,
    [property: Column("events_dropped")] int EventsDropped,
    [property: Column("encounters")] int Encounters);

public sealed record EventExportRow(
    [property: Column("session_id")] Guid SessionId,
    [property: Column("client_event_id")] Guid ClientEventId,
    [property: Column("event_type")] string EventType,
    [property: Column("map_code")] string? MapCode,
    [property: Column("pos_x")] float? PosX,
    [property: Column("pos_y")] float? PosY,
    [property: Column("occurred_at")] DateTime OccurredAt,
    [property: Column("payload")] string Payload);

public sealed record EncounterExportRow(
    [property: Column("session_id")] Guid SessionId,
    [property: Column("source")] string Source,
    [property: Column("content_version_id")] Guid? ContentVersionId,
    [property: Column("solver_code")] string? SolverCode,
    [property: Column("solver_family")] string? SolverFamily,
    [property: Column("encounter_index")] int EncounterIndex,
    [property: Column("outcome")] string Outcome,
    [property: Column("started_at")] DateTime StartedAt,
    [property: Column("ended_at")] DateTime EndedAt,
    [property: Column("duration_seconds")] double DurationSeconds,
    [property: Column("num_agents")] int NumAgents,
    [property: Column("num_replans")] int NumReplans,
    [property: Column("num_fallbacks")] int NumFallbacks,
    [property: Column("coordination_score")] double? CoordinationScore);

public sealed record ResultExportRow(
    [property: Column("result_id")] Guid ResultId,
    [property: Column("session_id")] Guid SessionId,
    [property: Column("source")] string Source,
    [property: Column("content_version_id")] Guid? ContentVersionId,
    [property: Column("assigned_solver_code")] string? AssignedSolverCode,
    [property: Column("solver_code")] string SolverCode,
    [property: Column("solver_family")] string SolverFamily,
    [property: Column("task_type")] string TaskType,
    [property: Column("map_code")] string? MapCode,
    [property: Column("squad_tag")] string? SquadTag,
    [property: Column("num_agents")] int NumAgents,
    [property: Column("num_nodes")] int NumNodes,
    [property: Column("num_qubo_vars")] int? NumQuboVars,
    [property: Column("objective_value")] double? ObjectiveValue,
    [property: Column("solve_latency_ms")] double SolveLatencyMs,
    [property: Column("within_budget")] bool WithinBudget,
    [property: Column("used_fallback")] bool UsedFallback,
    [property: Column("coordination_score")] double? CoordinationScore,
    [property: Column("triggered_at")] DateTime TriggeredAt);
