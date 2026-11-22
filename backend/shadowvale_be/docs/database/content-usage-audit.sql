-- Read-only inventory. Run on the target PostgreSQL database using an authorized database client.
-- Statistics are estimates and cumulative since stats_reset, not proof that a table is unused.
BEGIN TRANSACTION READ ONLY;

SELECT current_database() AS database_name, now() AS observed_at, stats_reset
FROM pg_stat_database WHERE datname = current_database();

WITH expected(name) AS (VALUES
  ('users'), ('refresh_tokens'), ('content_versions'), ('content_publication_history'),
  ('items'), ('weapons'), ('consumables'), ('skills'), ('loot_tables'), ('loot_table_entries'),
  ('maps'), ('map_loot_tables'), ('enemy_types'), ('enemy_placements'),
  ('crafting_recipes'), ('crafting_recipe_ingredients'), ('quests'), ('quest_rewards'),
  ('players'), ('game_sessions'), ('telemetry_events'), ('solver_configurations'), ('coordination_results')
)
SELECT n.nspname AS schema_name, c.relname AS table_name,
       CASE WHEN n.nspname = 'shadowvale' AND e.name IS NOT NULL THEN 'Mapped application table'
            WHEN c.relname = '__EFMigrationsHistory' THEN 'EF migration history; retain'
            ELSE 'Unmapped here; investigate ownership and consumers' END AS source_assessment,
       s.n_live_tup AS estimated_rows, s.seq_scan, s.idx_scan,
       s.n_tup_ins, s.n_tup_upd, s.n_tup_del,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN expected e ON e.name = c.relname
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE c.relkind IN ('r', 'p') AND n.nspname IN ('shadowvale', 'public')
ORDER BY n.nspname, c.relname;

-- Incoming/outgoing constraints must be reviewed before even proposing a DROP.
SELECT ns.nspname AS schema_name, tbl.relname AS table_name, con.conname,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class tbl ON tbl.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
WHERE con.contype = 'f' AND ns.nspname IN ('shadowvale', 'public')
ORDER BY ns.nspname, tbl.relname, con.conname;

SELECT schemaname, viewname, definition FROM pg_views
WHERE schemaname IN ('shadowvale', 'public') ORDER BY schemaname, viewname;
SELECT n.nspname AS schema_name, c.relname AS table_name, t.tgname,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname IN ('shadowvale', 'public');

COMMIT;
