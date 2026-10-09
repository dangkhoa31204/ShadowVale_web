using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ShadowVale.DAL.Migrations
{
    /// <inheritdoc />
    public partial class ContentAndTelemetry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "content_versions",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_no = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    changelog = table.Column<string>(type: "text", nullable: true),
                    parent_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    revision = table.Column<long>(type: "bigint", nullable: false),
                    schema_version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    bundle = table.Column<string>(type: "jsonb", nullable: true),
                    bundle_checksum = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    validation_errors = table.Column<string>(type: "jsonb", nullable: true),
                    validated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    authored_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reviewed_by_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    review_note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    published_by_id = table.Column<Guid>(type: "uuid", nullable: true),
                    published_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    archived_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_content_versions", x => x.id);
                    table.CheckConstraint("ck_content_versions_published_has_bundle", "status NOT IN ('Published', 'Archived') OR (bundle IS NOT NULL AND bundle_checksum IS NOT NULL)");
                    table.ForeignKey(
                        name: "fk_content_versions_content_versions_parent_version_id",
                        column: x => x.parent_version_id,
                        principalSchema: "shadowvale",
                        principalTable: "content_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_content_versions_users_authored_by_id",
                        column: x => x.authored_by_id,
                        principalSchema: "shadowvale",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_content_versions_users_published_by_id",
                        column: x => x.published_by_id,
                        principalSchema: "shadowvale",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_content_versions_users_reviewed_by_id",
                        column: x => x.reviewed_by_id,
                        principalSchema: "shadowvale",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "players",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    install_id = table.Column<Guid>(type: "uuid", nullable: false),
                    last_seen_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_players", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "solver_configurations",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    algorithm = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    family = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    library = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    @params = table.Column<string>(name: "params", type: "jsonb", nullable: false),
                    qubo_weights = table.Column<string>(type: "jsonb", nullable: false),
                    time_budget_ms = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_solver_configurations", x => x.id);
                    table.CheckConstraint("ck_solver_configurations_family", "(family = 'Classical') = (algorithm IN ('Greedy', 'Genetic', 'ClassicalSa')) AND (family = 'QuantumHardware') = (algorithm = 'QpuDwave')");
                    table.CheckConstraint("ck_solver_configurations_time_budget", "time_budget_ms > 0");
                });

            migrationBuilder.CreateTable(
                name: "content_publication_history",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    content_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    previous_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_content_publication_history", x => x.id);
                    table.ForeignKey(
                        name: "fk_content_publication_history_content_versions_content_versio",
                        column: x => x.content_version_id,
                        principalSchema: "shadowvale",
                        principalTable: "content_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_content_publication_history_content_versions_previous_versi",
                        column: x => x.previous_version_id,
                        principalSchema: "shadowvale",
                        principalTable: "content_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_content_publication_history_users_actor_id",
                        column: x => x.actor_id,
                        principalSchema: "shadowvale",
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "items",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    rarity = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    max_stack = table.Column<int>(type: "integer", nullable: false),
                    weight = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    base_value = table.Column<int>(type: "integer", nullable: false),
                    stats = table.Column<string>(type: "jsonb", nullable: false),
                    icon_key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    content_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_items", x => x.id);
                    table.CheckConstraint("ck_items_base_value", "base_value >= 0");
                    table.CheckConstraint("ck_items_max_stack", "max_stack >= 1");
                    table.CheckConstraint("ck_items_weapon_not_stackable", "type <> 'Weapon' OR max_stack = 1");
                    table.CheckConstraint("ck_items_weight", "weight >= 0");
                    table.ForeignKey(
                        name: "fk_items_content_versions_content_version_id",
                        column: x => x.content_version_id,
                        principalSchema: "shadowvale",
                        principalTable: "content_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "loot_tables",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    rolls_min = table.Column<int>(type: "integer", nullable: false),
                    rolls_max = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    content_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loot_tables", x => x.id);
                    table.CheckConstraint("ck_loot_tables_rolls_min", "rolls_min >= 0");
                    table.CheckConstraint("ck_loot_tables_rolls_range", "rolls_max >= rolls_min");
                    table.ForeignKey(
                        name: "fk_loot_tables_content_versions_content_version_id",
                        column: x => x.content_version_id,
                        principalSchema: "shadowvale",
                        principalTable: "content_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "maps",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    scene_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    is_safe_camp = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    nav_graph = table.Column<string>(type: "jsonb", nullable: false),
                    layout = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    content_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_maps", x => x.id);
                    table.ForeignKey(
                        name: "fk_maps_content_versions_content_version_id",
                        column: x => x.content_version_id,
                        principalSchema: "shadowvale",
                        principalTable: "content_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quests",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    is_main = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    objectives = table.Column<string>(type: "jsonb", nullable: false),
                    prerequisites = table.Column<List<string>>(type: "text[]", nullable: false),
                    reward_xp = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    content_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_quests", x => x.id);
                    table.CheckConstraint("ck_quests_reward_xp", "reward_xp >= 0");
                    table.ForeignKey(
                        name: "fk_quests_content_versions_content_version_id",
                        column: x => x.content_version_id,
                        principalSchema: "shadowvale",
                        principalTable: "content_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "skills",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    max_level = table.Column<int>(type: "integer", nullable: false),
                    xp_curve = table.Column<string>(type: "jsonb", nullable: false),
                    effects = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    content_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_skills", x => x.id);
                    table.CheckConstraint("ck_skills_max_level", "max_level > 0");
                    table.ForeignKey(
                        name: "fk_skills_content_versions_content_version_id",
                        column: x => x.content_version_id,
                        principalSchema: "shadowvale",
                        principalTable: "content_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "game_sessions",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    player_id = table.Column<Guid>(type: "uuid", nullable: true),
                    content_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    outcome = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    client_version = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    platform = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_sessions", x => x.id);
                    table.CheckConstraint("ck_game_sessions_ended_after_started", "ended_at IS NULL OR ended_at >= started_at");
                    table.ForeignKey(
                        name: "fk_game_sessions_content_versions_content_version_id",
                        column: x => x.content_version_id,
                        principalSchema: "shadowvale",
                        principalTable: "content_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_game_sessions_players_player_id",
                        column: x => x.player_id,
                        principalSchema: "shadowvale",
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "consumables",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    heal_hp = table.Column<int>(type: "integer", nullable: false),
                    restore_stamina = table.Column<int>(type: "integer", nullable: false),
                    use_time_seconds = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    cures = table.Column<List<string>>(type: "text[]", nullable: false),
                    extra_effects = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_consumables", x => x.id);
                    table.CheckConstraint("ck_consumables_heal_hp", "heal_hp >= 0");
                    table.CheckConstraint("ck_consumables_restore_stamina", "restore_stamina >= 0");
                    table.CheckConstraint("ck_consumables_use_time", "use_time_seconds >= 0");
                    table.ForeignKey(
                        name: "fk_consumables_items_item_id",
                        column: x => x.item_id,
                        principalSchema: "shadowvale",
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "weapons",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    @class = table.Column<string>(name: "class", type: "character varying(30)", maxLength: 30, nullable: false),
                    damage = table.Column<decimal>(type: "numeric(7,2)", precision: 7, scale: 2, nullable: false),
                    fire_rate = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    effective_range = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    magazine_size = table.Column<int>(type: "integer", nullable: true),
                    reload_time_seconds = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    ammo_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    max_durability = table.Column<int>(type: "integer", nullable: false),
                    durability_per_use = table.Column<decimal>(type: "numeric(6,3)", precision: 6, scale: 3, nullable: false),
                    noise_radius = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    is_suppressed = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_weapons", x => x.id);
                    table.CheckConstraint("ck_weapons_damage", "damage > 0");
                    table.CheckConstraint("ck_weapons_effective_range", "effective_range >= 0");
                    table.CheckConstraint("ck_weapons_fire_rate", "fire_rate > 0");
                    table.CheckConstraint("ck_weapons_magazine_size", "magazine_size IS NULL OR magazine_size >= 1");
                    table.CheckConstraint("ck_weapons_max_durability", "max_durability > 0");
                    table.CheckConstraint("ck_weapons_melee_no_ammo", "class <> 'Melee' OR (ammo_item_id IS NULL AND magazine_size IS NULL)");
                    table.CheckConstraint("ck_weapons_noise_radius", "noise_radius >= 0");
                    table.ForeignKey(
                        name: "fk_weapons_items_ammo_item_id",
                        column: x => x.ammo_item_id,
                        principalSchema: "shadowvale",
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_weapons_items_item_id",
                        column: x => x.item_id,
                        principalSchema: "shadowvale",
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "loot_table_entries",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    loot_table_id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tier = table.Column<short>(type: "smallint", nullable: false),
                    weight = table.Column<decimal>(type: "numeric(10,4)", precision: 10, scale: 4, nullable: false),
                    min_quantity = table.Column<int>(type: "integer", nullable: false),
                    max_quantity = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_loot_table_entries", x => x.id);
                    table.CheckConstraint("ck_loot_table_entries_quantity", "min_quantity >= 1 AND max_quantity >= min_quantity");
                    table.CheckConstraint("ck_loot_table_entries_tier", "tier BETWEEN 1 AND 5");
                    table.CheckConstraint("ck_loot_table_entries_weight", "weight > 0");
                    table.ForeignKey(
                        name: "fk_loot_table_entries_items_item_id",
                        column: x => x.item_id,
                        principalSchema: "shadowvale",
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_loot_table_entries_loot_tables_loot_table_id",
                        column: x => x.loot_table_id,
                        principalSchema: "shadowvale",
                        principalTable: "loot_tables",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "map_loot_tables",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    map_id = table.Column<Guid>(type: "uuid", nullable: false),
                    loot_table_id = table.Column<Guid>(type: "uuid", nullable: false),
                    container_tag = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_map_loot_tables", x => x.id);
                    table.ForeignKey(
                        name: "fk_map_loot_tables_loot_tables_loot_table_id",
                        column: x => x.loot_table_id,
                        principalSchema: "shadowvale",
                        principalTable: "loot_tables",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_map_loot_tables_maps_map_id",
                        column: x => x.map_id,
                        principalSchema: "shadowvale",
                        principalTable: "maps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quest_rewards",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    quest_id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_quest_rewards", x => x.id);
                    table.CheckConstraint("ck_quest_rewards_quantity", "quantity > 0");
                    table.ForeignKey(
                        name: "fk_quest_rewards_items_item_id",
                        column: x => x.item_id,
                        principalSchema: "shadowvale",
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_quest_rewards_quests_quest_id",
                        column: x => x.quest_id,
                        principalSchema: "shadowvale",
                        principalTable: "quests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "crafting_recipes",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    output_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    output_quantity = table.Column<int>(type: "integer", nullable: false),
                    craft_time_seconds = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    required_skill_id = table.Column<Guid>(type: "uuid", nullable: true),
                    required_skill_level = table.Column<int>(type: "integer", nullable: false),
                    station = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    content_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_crafting_recipes", x => x.id);
                    table.CheckConstraint("ck_crafting_recipes_craft_time", "craft_time_seconds >= 0");
                    table.CheckConstraint("ck_crafting_recipes_output_quantity", "output_quantity > 0");
                    table.CheckConstraint("ck_crafting_recipes_skill_level", "required_skill_level >= 0");
                    table.ForeignKey(
                        name: "fk_crafting_recipes_content_versions_content_version_id",
                        column: x => x.content_version_id,
                        principalSchema: "shadowvale",
                        principalTable: "content_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_crafting_recipes_items_output_item_id",
                        column: x => x.output_item_id,
                        principalSchema: "shadowvale",
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_crafting_recipes_skills_required_skill_id",
                        column: x => x.required_skill_id,
                        principalSchema: "shadowvale",
                        principalTable: "skills",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "coordination_results",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    solver_configuration_id = table.Column<Guid>(type: "uuid", nullable: false),
                    map_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    squad_tag = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    task_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    num_agents = table.Column<int>(type: "integer", nullable: false),
                    num_nodes = table.Column<int>(type: "integer", nullable: false),
                    num_qubo_vars = table.Column<int>(type: "integer", nullable: true),
                    objective_value = table.Column<double>(type: "double precision", nullable: true),
                    solve_latency_ms = table.Column<double>(type: "double precision", nullable: false),
                    within_budget = table.Column<bool>(type: "boolean", nullable: false),
                    used_fallback = table.Column<bool>(type: "boolean", nullable: false),
                    assignment = table.Column<string>(type: "jsonb", nullable: true),
                    coordination_score = table.Column<double>(type: "double precision", nullable: true),
                    encounter_outcome = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    escape_time_ms = table.Column<double>(type: "double precision", nullable: true),
                    triggered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_coordination_results", x => x.id);
                    table.CheckConstraint("ck_coordination_results_latency", "solve_latency_ms >= 0");
                    table.CheckConstraint("ck_coordination_results_num_agents", "num_agents > 0");
                    table.CheckConstraint("ck_coordination_results_num_nodes", "num_nodes > 0");
                    table.ForeignKey(
                        name: "fk_coordination_results_game_sessions_session_id",
                        column: x => x.session_id,
                        principalSchema: "shadowvale",
                        principalTable: "game_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_coordination_results_solver_configurations_solver_configura",
                        column: x => x.solver_configuration_id,
                        principalSchema: "shadowvale",
                        principalTable: "solver_configurations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "telemetry_events",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityAlwaysColumn),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    client_event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    map_code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    pos_x = table.Column<float>(type: "real", nullable: true),
                    pos_y = table.Column<float>(type: "real", nullable: true),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    received_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_telemetry_events", x => x.id);
                    table.ForeignKey(
                        name: "fk_telemetry_events_game_sessions_session_id",
                        column: x => x.session_id,
                        principalSchema: "shadowvale",
                        principalTable: "game_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "enemy_types",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    archetype = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_boss = table.Column<bool>(type: "boolean", nullable: false),
                    max_hp = table.Column<int>(type: "integer", nullable: false),
                    move_speed = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    vision_range = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    vision_angle_degrees = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    hearing_range = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    accuracy = table.Column<decimal>(type: "numeric(4,3)", precision: 4, scale: 3, nullable: false),
                    weapon_id = table.Column<Guid>(type: "uuid", nullable: true),
                    fsm_params = table.Column<string>(type: "jsonb", nullable: false),
                    loot_table_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    content_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_enemy_types", x => x.id);
                    table.CheckConstraint("ck_enemy_types_accuracy", "accuracy BETWEEN 0 AND 1");
                    table.CheckConstraint("ck_enemy_types_max_hp", "max_hp > 0");
                    table.CheckConstraint("ck_enemy_types_move_speed", "move_speed > 0");
                    table.CheckConstraint("ck_enemy_types_vision_angle", "vision_angle_degrees BETWEEN 0 AND 360");
                    table.ForeignKey(
                        name: "fk_enemy_types_content_versions_content_version_id",
                        column: x => x.content_version_id,
                        principalSchema: "shadowvale",
                        principalTable: "content_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_enemy_types_loot_tables_loot_table_id",
                        column: x => x.loot_table_id,
                        principalSchema: "shadowvale",
                        principalTable: "loot_tables",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_enemy_types_weapons_weapon_id",
                        column: x => x.weapon_id,
                        principalSchema: "shadowvale",
                        principalTable: "weapons",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "crafting_recipe_ingredients",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    recipe_id = table.Column<Guid>(type: "uuid", nullable: false),
                    item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_crafting_recipe_ingredients", x => x.id);
                    table.CheckConstraint("ck_crafting_recipe_ingredients_quantity", "quantity > 0");
                    table.ForeignKey(
                        name: "fk_crafting_recipe_ingredients_crafting_recipes_recipe_id",
                        column: x => x.recipe_id,
                        principalSchema: "shadowvale",
                        principalTable: "crafting_recipes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_crafting_recipe_ingredients_items_item_id",
                        column: x => x.item_id,
                        principalSchema: "shadowvale",
                        principalTable: "items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "enemy_placements",
                schema: "shadowvale",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    map_id = table.Column<Guid>(type: "uuid", nullable: false),
                    enemy_type_id = table.Column<Guid>(type: "uuid", nullable: false),
                    squad_tag = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    pos_x = table.Column<decimal>(type: "numeric(9,3)", precision: 9, scale: 3, nullable: false),
                    pos_y = table.Column<decimal>(type: "numeric(9,3)", precision: 9, scale: 3, nullable: false),
                    facing_degrees = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    patrol_route = table.Column<string>(type: "jsonb", nullable: false),
                    spawn_condition = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_enemy_placements", x => x.id);
                    table.ForeignKey(
                        name: "fk_enemy_placements_enemy_types_enemy_type_id",
                        column: x => x.enemy_type_id,
                        principalSchema: "shadowvale",
                        principalTable: "enemy_types",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_enemy_placements_maps_map_id",
                        column: x => x.map_id,
                        principalSchema: "shadowvale",
                        principalTable: "maps",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_consumables_item_id",
                schema: "shadowvale",
                table: "consumables",
                column: "item_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_content_publication_history_actor_id",
                schema: "shadowvale",
                table: "content_publication_history",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "ix_content_publication_history_content_version_id",
                schema: "shadowvale",
                table: "content_publication_history",
                column: "content_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_content_publication_history_created_at",
                schema: "shadowvale",
                table: "content_publication_history",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_content_publication_history_previous_version_id",
                schema: "shadowvale",
                table: "content_publication_history",
                column: "previous_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_content_versions_authored_by_id",
                schema: "shadowvale",
                table: "content_versions",
                column: "authored_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_content_versions_parent_version_id",
                schema: "shadowvale",
                table: "content_versions",
                column: "parent_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_content_versions_published_by_id",
                schema: "shadowvale",
                table: "content_versions",
                column: "published_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_content_versions_reviewed_by_id",
                schema: "shadowvale",
                table: "content_versions",
                column: "reviewed_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_content_versions_status",
                schema: "shadowvale",
                table: "content_versions",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_content_versions_version_no",
                schema: "shadowvale",
                table: "content_versions",
                column: "version_no",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_content_versions_one_published",
                schema: "shadowvale",
                table: "content_versions",
                column: "status",
                unique: true,
                filter: "status = 'Published'");

            migrationBuilder.CreateIndex(
                name: "ix_coordination_results_session_id",
                schema: "shadowvale",
                table: "coordination_results",
                column: "session_id");

            migrationBuilder.CreateIndex(
                name: "ix_coordination_results_solver_configuration_id",
                schema: "shadowvale",
                table: "coordination_results",
                column: "solver_configuration_id");

            migrationBuilder.CreateIndex(
                name: "ix_crafting_recipe_ingredients_item_id",
                schema: "shadowvale",
                table: "crafting_recipe_ingredients",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "ix_crafting_recipe_ingredients_recipe_id_item_id",
                schema: "shadowvale",
                table: "crafting_recipe_ingredients",
                columns: new[] { "recipe_id", "item_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_crafting_recipes_content_version_id_code",
                schema: "shadowvale",
                table: "crafting_recipes",
                columns: new[] { "content_version_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_crafting_recipes_output_item_id",
                schema: "shadowvale",
                table: "crafting_recipes",
                column: "output_item_id");

            migrationBuilder.CreateIndex(
                name: "ix_crafting_recipes_required_skill_id",
                schema: "shadowvale",
                table: "crafting_recipes",
                column: "required_skill_id");

            migrationBuilder.CreateIndex(
                name: "ix_enemy_placements_enemy_type_id",
                schema: "shadowvale",
                table: "enemy_placements",
                column: "enemy_type_id");

            migrationBuilder.CreateIndex(
                name: "ix_enemy_placements_map_id",
                schema: "shadowvale",
                table: "enemy_placements",
                column: "map_id");

            migrationBuilder.CreateIndex(
                name: "ix_enemy_types_content_version_id_code",
                schema: "shadowvale",
                table: "enemy_types",
                columns: new[] { "content_version_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_enemy_types_loot_table_id",
                schema: "shadowvale",
                table: "enemy_types",
                column: "loot_table_id");

            migrationBuilder.CreateIndex(
                name: "ix_enemy_types_weapon_id",
                schema: "shadowvale",
                table: "enemy_types",
                column: "weapon_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_sessions_content_version_id",
                schema: "shadowvale",
                table: "game_sessions",
                column: "content_version_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_sessions_player_id",
                schema: "shadowvale",
                table: "game_sessions",
                column: "player_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_sessions_started_at",
                schema: "shadowvale",
                table: "game_sessions",
                column: "started_at");

            migrationBuilder.CreateIndex(
                name: "ix_items_content_version_id_code",
                schema: "shadowvale",
                table: "items",
                columns: new[] { "content_version_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_loot_table_entries_item_id",
                schema: "shadowvale",
                table: "loot_table_entries",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "ix_loot_table_entries_loot_table_id_item_id_tier",
                schema: "shadowvale",
                table: "loot_table_entries",
                columns: new[] { "loot_table_id", "item_id", "tier" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_loot_tables_content_version_id_code",
                schema: "shadowvale",
                table: "loot_tables",
                columns: new[] { "content_version_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_map_loot_tables_loot_table_id",
                schema: "shadowvale",
                table: "map_loot_tables",
                column: "loot_table_id");

            migrationBuilder.CreateIndex(
                name: "ix_map_loot_tables_map_id_loot_table_id_container_tag",
                schema: "shadowvale",
                table: "map_loot_tables",
                columns: new[] { "map_id", "loot_table_id", "container_tag" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_maps_content_version_id_code",
                schema: "shadowvale",
                table: "maps",
                columns: new[] { "content_version_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_players_install_id",
                schema: "shadowvale",
                table: "players",
                column: "install_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_quest_rewards_item_id",
                schema: "shadowvale",
                table: "quest_rewards",
                column: "item_id");

            migrationBuilder.CreateIndex(
                name: "ix_quest_rewards_quest_id_item_id",
                schema: "shadowvale",
                table: "quest_rewards",
                columns: new[] { "quest_id", "item_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_quests_content_version_id_code",
                schema: "shadowvale",
                table: "quests",
                columns: new[] { "content_version_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_skills_content_version_id_code",
                schema: "shadowvale",
                table: "skills",
                columns: new[] { "content_version_id", "code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_solver_configurations_code",
                schema: "shadowvale",
                table: "solver_configurations",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_telemetry_events_event_type_occurred_at",
                schema: "shadowvale",
                table: "telemetry_events",
                columns: new[] { "event_type", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "ix_telemetry_events_map_code",
                schema: "shadowvale",
                table: "telemetry_events",
                column: "map_code",
                filter: "map_code IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_telemetry_events_occurred_at",
                schema: "shadowvale",
                table: "telemetry_events",
                column: "occurred_at")
                .Annotation("Npgsql:IndexMethod", "brin");

            migrationBuilder.CreateIndex(
                name: "ix_telemetry_events_session_id_client_event_id",
                schema: "shadowvale",
                table: "telemetry_events",
                columns: new[] { "session_id", "client_event_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_weapons_ammo_item_id",
                schema: "shadowvale",
                table: "weapons",
                column: "ammo_item_id");

            migrationBuilder.CreateIndex(
                name: "ix_weapons_item_id",
                schema: "shadowvale",
                table: "weapons",
                column: "item_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "consumables",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "content_publication_history",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "coordination_results",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "crafting_recipe_ingredients",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "enemy_placements",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "loot_table_entries",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "map_loot_tables",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "quest_rewards",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "telemetry_events",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "solver_configurations",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "crafting_recipes",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "enemy_types",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "maps",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "quests",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "game_sessions",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "skills",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "loot_tables",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "weapons",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "players",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "items",
                schema: "shadowvale");

            migrationBuilder.DropTable(
                name: "content_versions",
                schema: "shadowvale");
        }
    }
}
