using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Queries;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.DAL.Repositories;

// Aggregates in SQL so Postgres does the counting. Every value goes in as a parameter (see Sql);
// only fixed fragments chosen in code (group key, finished-only) are pasted into the text.
public class AnalyticsRepository(ShadowValeDbContext context) : IAnalyticsRepository
{
    public async Task<OverviewRow> GetOverviewAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        var rows = await Query<OverviewRow>(sql, $"""
            WITH {Sessions(sql, filter)}
            SELECT count(*) AS sessions,
                   count(DISTINCT player_id) AS players,
                   count(*) FILTER (WHERE outcome = 'InProgress') AS unfinished,
                   avg(extract(epoch FROM ended_at - started_at)::float8) AS avg_duration_seconds,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM ended_at - started_at)::float8) AS median_duration_seconds
            FROM sessions
            """).ToListAsync(ct);
        return rows.Single();
    }

    public Task<List<KeyCountRow>> GetOutcomeCountsAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        return Query<KeyCountRow>(sql, $"""
            WITH {Sessions(sql, filter)}
            SELECT outcome AS key, count(*) AS count FROM sessions GROUP BY outcome ORDER BY outcome
            """).ToListAsync(ct);
    }

    public Task<List<DayCountRow>> GetSessionsPerDayAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        return Query<DayCountRow>(sql, $"""
            WITH {Sessions(sql, filter)}
            SELECT (started_at AT TIME ZONE 'UTC')::date AS day, count(*) AS count FROM sessions GROUP BY 1 ORDER BY 1
            """).ToListAsync(ct);
    }

    public Task<List<HeatCellRow>> GetHeatmapAsync(
        AnalyticsFilter filter, string mapCode, IReadOnlyList<string> eventTypes, int cellSize, CancellationToken ct = default)
    {
        var sql = new Sql();
        var cell = sql.Add((double)cellSize);
        return Query<HeatCellRow>(sql, $"""
            WITH {Sessions(sql, filter)}
            SELECT floor(e.pos_x / {cell}::float8) * {cell}::float8 AS x,
                   floor(e.pos_y / {cell}::float8) * {cell}::float8 AS y,
                   count(*) AS count
            FROM shadowvale.telemetry_events e
            JOIN sessions s ON s.id = e.session_id
            WHERE e.map_code = {sql.Add(mapCode)}
              AND e.event_type = ANY({sql.Add(eventTypes.ToArray())}::text[])
              AND e.pos_x IS NOT NULL AND e.pos_y IS NOT NULL
            GROUP BY 1, 2
            ORDER BY 1, 2
            """).ToListAsync(ct);
    }

    public async Task<long> CountSessionsAsync(AnalyticsFilter filter, bool finishedOnly, CancellationToken ct = default)
    {
        var sql = new Sql();
        var rows = await Query<long>(sql, $"""
            WITH {Sessions(sql, filter, finishedOnly)}
            SELECT count(*) AS "Value" FROM sessions
            """).ToListAsync(ct);
        return rows.Single();
    }

    public Task<List<FunnelStepRow>> GetObjectiveStepsAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        // payload.index must be a small whole number; anything else is ignored instead of failing the cast
        return Query<FunnelStepRow>(sql, $"""
            WITH {Sessions(sql, filter)}
            SELECT (e.payload ->> 'index')::int AS step, count(DISTINCT e.session_id) AS sessions
            FROM shadowvale.telemetry_events e
            JOIN sessions s ON s.id = e.session_id
            WHERE e.event_type = 'objective_completed'
              AND jsonb_typeof(e.payload -> 'index') = 'number'
              AND (e.payload ->> 'index') ~ '^[0-9]+$' AND length(e.payload ->> 'index') <= 4
            GROUP BY 1
            ORDER BY 1
            """).ToListAsync(ct);
    }

    public async Task<long> CountMissionsCompletedAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        var rows = await Query<long>(sql, $"""
            WITH {Sessions(sql, filter)}
            SELECT count(DISTINCT e.session_id) AS "Value"
            FROM shadowvale.telemetry_events e
            JOIN sessions s ON s.id = e.session_id
            WHERE e.event_type = 'mission_result' AND e.payload ->> 'result' = 'completed'
            """).ToListAsync(ct);
        return rows.Single();
    }

    public Task<List<WeaponRow>> GetWeaponsAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        return Query<WeaponRow>(sql, $"""
            WITH {Sessions(sql, filter, finishedOnly: true)},
            shots AS (
                SELECT w.key AS weapon, sum(w.value::bigint) AS shots, count(*) FILTER (WHERE w.value::bigint > 0) AS sessions_used
                FROM sessions s, jsonb_each_text(s.stats -> 'shotsByWeapon') w
                GROUP BY 1),
            kills AS (
                SELECT w.key AS weapon, sum(w.value::bigint) AS kills
                FROM sessions s, jsonb_each_text(s.stats -> 'killsByWeapon') w
                GROUP BY 1)
            SELECT coalesce(shots.weapon, kills.weapon) AS weapon,
                   coalesce(shots.shots, 0)::bigint AS shots,
                   coalesce(kills.kills, 0)::bigint AS kills,
                   coalesce(shots.sessions_used, 0) AS sessions_used
            FROM shots FULL JOIN kills ON kills.weapon = shots.weapon
            ORDER BY 2 DESC, 1
            """).ToListAsync(ct);
    }

    public async Task<PlaystyleRow> GetPlaystyleAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        var rows = await Query<PlaystyleRow>(sql, $"""
            WITH {Sessions(sql, filter, finishedOnly: true)},
            {Playstyle}
            SELECT count(*) AS sessions,
                   count(*) FILTER (WHERE takedowns + weapon_kills = 0) AS sessions_without_kills,
                   avg(stealth_ratio) AS avg_stealth_ratio,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY stealth_ratio) AS median_stealth_ratio,
                   avg(times_detected::float8) AS avg_times_detected,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY times_detected::float8) AS median_times_detected
            FROM playstyle
            """).ToListAsync(ct);
        return rows.Single();
    }

    public Task<List<BucketRow>> GetStealthHistogramAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        // 10 buckets of width 0.1; a ratio of exactly 1 goes into the last one
        return Query<BucketRow>(sql, $"""
            WITH {Sessions(sql, filter, finishedOnly: true)},
            {Playstyle}
            SELECT least(floor(stealth_ratio * 10), 9)::int AS bucket, count(*) AS count
            FROM playstyle
            WHERE stealth_ratio IS NOT NULL
            GROUP BY 1
            ORDER BY 1
            """).ToListAsync(ct);
    }

    public Task<List<EncounterMetricsRow>> GetEncounterMetricsAsync(AnalyticsFilter filter, AnalyticsGroupBy groupBy, CancellationToken ct = default)
    {
        var sql = new Sql();
        var (key, label) = GroupColumns(groupBy);
        // Aborted encounters (session ended mid-fight) count for nothing; escape time only for escapes
        return Query<EncounterMetricsRow>(sql, $"""
            WITH {Sessions(sql, filter, finishedOnly: true)},
            encounters AS (
                SELECT s.id AS session_id, s.content_version_id, s.solver_configuration_id,
                       e ->> 'outcome' AS outcome,
                       extract(epoch FROM (e ->> 'endedAt')::timestamptz - (e ->> 'startedAt')::timestamptz)::float8 AS seconds
                FROM sessions s,
                     jsonb_array_elements(CASE WHEN jsonb_typeof(s.stats -> 'encounters') = 'array' THEN s.stats -> 'encounters' ELSE '[]'::jsonb END) e)
            SELECT en.content_version_id, cv.label AS content_version_label,
                   {key} AS group_key, {label} AS group_label, sc.family,
                   count(DISTINCT en.session_id) AS sessions,
                   count(*) FILTER (WHERE en.outcome <> 'Aborted') AS encounters,
                   count(*) FILTER (WHERE en.outcome = 'PlayerCaptured') AS captures,
                   count(*) FILTER (WHERE en.outcome = 'PlayerEscaped') AS escapes,
                   avg(en.seconds) FILTER (WHERE en.outcome = 'PlayerEscaped') AS avg_escape_seconds,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY en.seconds) FILTER (WHERE en.outcome = 'PlayerEscaped') AS median_escape_seconds
            FROM encounters en
            JOIN shadowvale.solver_configurations sc ON sc.id = en.solver_configuration_id
            LEFT JOIN shadowvale.content_versions cv ON cv.id = en.content_version_id
            GROUP BY en.content_version_id, cv.label, {key}, {label}, sc.family
            ORDER BY cv.label, 4
            """).ToListAsync(ct);
    }

    public Task<List<ReplanMetricsRow>> GetReplanMetricsAsync(AnalyticsFilter filter, AnalyticsGroupBy groupBy, CancellationToken ct = default)
    {
        var sql = new Sql();
        var (key, label) = GroupColumns(groupBy);
        return Query<ReplanMetricsRow>(sql, $"""
            WITH {Sessions(sql, filter)}
            SELECT s.content_version_id, cv.label AS content_version_label,
                   {key} AS group_key, {label} AS group_label, sc.family,
                   count(*) AS replans,
                   avg(r.coordination_score) AS avg_coordination_score,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY r.solve_latency_ms) AS latency_p50,
                   percentile_cont(0.95) WITHIN GROUP (ORDER BY r.solve_latency_ms) AS latency_p95,
                   percentile_cont(0.99) WITHIN GROUP (ORDER BY r.solve_latency_ms) AS latency_p99,
                   avg(CASE WHEN r.within_budget THEN 1.0 ELSE 0.0 END)::float8 AS within_budget_rate,
                   avg(CASE WHEN r.used_fallback THEN 1.0 ELSE 0.0 END)::float8 AS fallback_rate
            FROM shadowvale.coordination_results r
            JOIN sessions s ON s.id = r.session_id
            JOIN shadowvale.solver_configurations sc ON sc.id = s.solver_configuration_id
            LEFT JOIN shadowvale.content_versions cv ON cv.id = s.content_version_id
            GROUP BY s.content_version_id, cv.label, {key}, {label}, sc.family
            ORDER BY cv.label, 4
            """).ToListAsync(ct);
    }

    public Task<List<ScalabilityRow>> GetScalabilityAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        return Query<ScalabilityRow>(sql, $"""
            WITH {Sessions(sql, filter)}
            SELECT sc.id AS configuration_id, sc.code, sc.family, r.num_agents, (r.num_nodes / 20) * 20 AS nodes_from,
                   count(*) AS replans,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY r.solve_latency_ms) AS latency_p50,
                   percentile_cont(0.95) WITHIN GROUP (ORDER BY r.solve_latency_ms) AS latency_p95,
                   avg(r.objective_value) AS avg_objective,
                   avg(CASE WHEN r.within_budget THEN 1.0 ELSE 0.0 END)::float8 AS within_budget_rate
            FROM shadowvale.coordination_results r
            JOIN sessions s ON s.id = r.session_id
            JOIN shadowvale.solver_configurations sc ON sc.id = r.solver_configuration_id
            GROUP BY sc.id, sc.code, sc.family, r.num_agents, 5
            ORDER BY sc.code, r.num_agents, 5
            """).ToListAsync(ct);
    }

    public IAsyncEnumerable<SessionExportRow> ExportSessionsAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        return Stream<SessionExportRow>(sql, $"""
            WITH {Sessions(sql, filter)}
            SELECT s.id AS session_id, s.player_id, s.source, s.content_version_id, cv.label AS content_version_label, s.map_code,
                   sc.code AS solver_code, sc.family AS solver_family, s.started_at, s.ended_at,
                   extract(epoch FROM s.ended_at - s.started_at)::float8 AS duration_seconds,
                   s.outcome, s.client_version, s.platform,
                   coalesce((s.stats ->> 'takedowns')::int, 0) AS takedowns,
                   coalesce((s.stats ->> 'weaponKills')::int, 0) AS weapon_kills,
                   coalesce((s.stats ->> 'timesDetected')::int, 0) AS times_detected,
                   coalesce((s.stats ->> 'eventsDropped')::int, 0) AS events_dropped,
                   CASE WHEN jsonb_typeof(s.stats -> 'encounters') = 'array' THEN jsonb_array_length(s.stats -> 'encounters') ELSE 0 END AS encounters
            FROM sessions s
            LEFT JOIN shadowvale.solver_configurations sc ON sc.id = s.solver_configuration_id
            LEFT JOIN shadowvale.content_versions cv ON cv.id = s.content_version_id
            ORDER BY s.started_at, s.id
            """, ct);
    }

    public IAsyncEnumerable<EventExportRow> ExportEventsAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        return Stream<EventExportRow>(sql, $"""
            WITH {Sessions(sql, filter)}
            SELECT e.session_id, e.client_event_id, e.event_type, e.map_code, e.pos_x, e.pos_y, e.occurred_at, e.payload::text AS payload
            FROM shadowvale.telemetry_events e
            JOIN sessions s ON s.id = e.session_id
            ORDER BY e.occurred_at, e.id
            """, ct);
    }

    public IAsyncEnumerable<EncounterExportRow> ExportEncountersAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        return Stream<EncounterExportRow>(sql, $"""
            WITH {Sessions(sql, filter, finishedOnly: true)}
            SELECT s.id AS session_id, s.source, s.content_version_id, sc.code AS solver_code, sc.family AS solver_family,
                   (e ->> 'index')::int AS encounter_index, e ->> 'outcome' AS outcome,
                   (e ->> 'startedAt')::timestamptz AS started_at, (e ->> 'endedAt')::timestamptz AS ended_at,
                   extract(epoch FROM (e ->> 'endedAt')::timestamptz - (e ->> 'startedAt')::timestamptz)::float8 AS duration_seconds,
                   coalesce((e ->> 'numAgents')::int, 0) AS num_agents,
                   coalesce((e ->> 'numReplans')::int, 0) AS num_replans,
                   coalesce((e ->> 'numFallbacks')::int, 0) AS num_fallbacks,
                   (e ->> 'coordinationScore')::float8 AS coordination_score
            FROM sessions s
            LEFT JOIN shadowvale.solver_configurations sc ON sc.id = s.solver_configuration_id,
                 jsonb_array_elements(CASE WHEN jsonb_typeof(s.stats -> 'encounters') = 'array' THEN s.stats -> 'encounters' ELSE '[]'::jsonb END) e
            ORDER BY s.started_at, s.id, 6
            """, ct);
    }

    public IAsyncEnumerable<ResultExportRow> ExportResultsAsync(AnalyticsFilter filter, CancellationToken ct = default)
    {
        var sql = new Sql();
        return Stream<ResultExportRow>(sql, $"""
            WITH {Sessions(sql, filter)}
            SELECT r.id AS result_id, r.session_id, s.source, s.content_version_id,
                   assigned.code AS assigned_solver_code, sc.code AS solver_code, sc.family AS solver_family,
                   r.task_type, r.map_code, r.squad_tag, r.num_agents, r.num_nodes, r.num_qubo_vars, r.objective_value,
                   r.solve_latency_ms, r.within_budget, r.used_fallback, r.coordination_score, r.triggered_at
            FROM shadowvale.coordination_results r
            JOIN sessions s ON s.id = r.session_id
            JOIN shadowvale.solver_configurations sc ON sc.id = r.solver_configuration_id
            LEFT JOIN shadowvale.solver_configurations assigned ON assigned.id = s.solver_configuration_id
            ORDER BY r.triggered_at, r.id
            """, ct);
    }

    // Stats counters per finished session; stealth ratio is null when the session had no kill
    private const string Playstyle = """
        playstyle AS (
            SELECT coalesce((stats ->> 'takedowns')::int, 0) AS takedowns,
                   coalesce((stats ->> 'weaponKills')::int, 0) AS weapon_kills,
                   coalesce((stats ->> 'timesDetected')::int, 0) AS times_detected,
                   coalesce((stats ->> 'takedowns')::int, 0)::float8
                       / nullif(coalesce((stats ->> 'takedowns')::int, 0) + coalesce((stats ->> 'weaponKills')::int, 0), 0) AS stealth_ratio
            FROM sessions)
        """;

    private static (string Key, string Label) GroupColumns(AnalyticsGroupBy groupBy) => groupBy switch
    {
        AnalyticsGroupBy.Family => ("sc.family", "sc.family"),
        _ => ("sc.id::text", "sc.code")
    };

    // CTE "sessions": the filtered sessions every query starts from. A null filter value means "no filter".
    private static string Sessions(Sql sql, AnalyticsFilter filter, bool finishedOnly = false)
    {
        var contentVersion = sql.Add(filter.ContentVersionId);
        var map = sql.Add(filter.MapCode);
        var from = sql.Add(filter.From);
        var to = sql.Add(filter.To);
        var solver = sql.Add(filter.SolverConfigurationId);
        var family = sql.Add(filter.Family?.ToString());
        return $"""
            sessions AS (
                SELECT s.* FROM shadowvale.game_sessions s
                LEFT JOIN shadowvale.solver_configurations fsc ON fsc.id = s.solver_configuration_id
                WHERE s.source = {sql.Add(filter.Source.ToString().ToLowerInvariant())}
                  AND ({contentVersion}::uuid IS NULL OR s.content_version_id = {contentVersion}::uuid)
                  AND ({map}::text IS NULL OR s.map_code = {map}::text)
                  AND ({from}::timestamptz IS NULL OR s.started_at >= {from}::timestamptz)
                  AND ({to}::timestamptz IS NULL OR s.started_at <= {to}::timestamptz)
                  AND ({solver}::uuid IS NULL OR s.solver_configuration_id = {solver}::uuid)
                  AND ({family}::text IS NULL OR fsc.family = {family}::text)
                  {(finishedOnly ? "AND s.ended_at IS NOT NULL" : "")})
            """;
    }

    private IQueryable<T> Query<T>(Sql sql, string text) => context.Database.SqlQuery<T>(sql.Build(text));

    private async IAsyncEnumerable<T> Stream<T>(Sql sql, string text, [EnumeratorCancellation] CancellationToken ct)
    {
        await foreach (var row in context.Database.SqlQuery<T>(sql.Build(text)).AsAsyncEnumerable().WithCancellation(ct))
            yield return row;
    }

    // Collects parameter values and hands out their {n} placeholders, so values never become part of the SQL text
    private sealed class Sql
    {
        private readonly List<object?> _values = [];

        public string Add(object? value)
        {
            _values.Add(value);
            return $"{{{_values.Count - 1}}}";
        }

        public FormattableString Build(string text) => FormattableStringFactory.Create(text, _values.ToArray());
    }
}
