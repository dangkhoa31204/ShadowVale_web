DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'shadowvale') THEN
        CREATE SCHEMA shadowvale;
    END IF;
END $EF$;
CREATE TABLE IF NOT EXISTS shadowvale.__ef_migrations_history (
    migration_id character varying(150) NOT NULL,
    product_version character varying(32) NOT NULL,
    CONSTRAINT pk___ef_migrations_history PRIMARY KEY (migration_id)
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008135658_InitialAuth') THEN
        IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'shadowvale') THEN
            CREATE SCHEMA shadowvale;
        END IF;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008135658_InitialAuth') THEN
    CREATE TABLE shadowvale.users (
        id uuid NOT NULL,
        username character varying(50) NOT NULL,
        email character varying(256) NOT NULL,
        password_hash text NOT NULL,
        full_name character varying(100),
        role character varying(20) NOT NULL,
        is_active boolean NOT NULL,
        last_login_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_users PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008135658_InitialAuth') THEN
    CREATE TABLE shadowvale.refresh_tokens (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        token_hash character varying(64) NOT NULL,
        expires_at timestamp with time zone NOT NULL,
        revoked_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
        CONSTRAINT fk_refresh_tokens_users_user_id FOREIGN KEY (user_id) REFERENCES shadowvale.users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008135658_InitialAuth') THEN
    CREATE UNIQUE INDEX ix_refresh_tokens_token_hash ON shadowvale.refresh_tokens (token_hash);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008135658_InitialAuth') THEN
    CREATE INDEX ix_refresh_tokens_user_id ON shadowvale.refresh_tokens (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008135658_InitialAuth') THEN
    CREATE UNIQUE INDEX ix_users_email ON shadowvale.users (email);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008135658_InitialAuth') THEN
    CREATE UNIQUE INDEX ix_users_username ON shadowvale.users (username);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008135658_InitialAuth') THEN
    INSERT INTO shadowvale.__ef_migrations_history (migration_id, product_version)
    VALUES ('20261008135658_InitialAuth', '10.0.12');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.content_versions (
        id uuid NOT NULL,
        version_no bigint GENERATED ALWAYS AS IDENTITY,
        label character varying(200) NOT NULL,
        changelog text,
        parent_version_id uuid,
        status character varying(30) NOT NULL,
        revision bigint NOT NULL,
        schema_version character varying(20) NOT NULL,
        bundle jsonb,
        bundle_checksum character varying(64),
        validation_errors jsonb,
        validated_at timestamp with time zone,
        authored_by_id uuid NOT NULL,
        submitted_at timestamp with time zone,
        reviewed_by_id uuid,
        reviewed_at timestamp with time zone,
        review_note character varying(2000),
        published_by_id uuid,
        published_at timestamp with time zone,
        archived_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_content_versions PRIMARY KEY (id),
        CONSTRAINT ck_content_versions_published_has_bundle CHECK (status NOT IN ('Published', 'Archived') OR (bundle IS NOT NULL AND bundle_checksum IS NOT NULL)),
        CONSTRAINT fk_content_versions_content_versions_parent_version_id FOREIGN KEY (parent_version_id) REFERENCES shadowvale.content_versions (id) ON DELETE SET NULL,
        CONSTRAINT fk_content_versions_users_authored_by_id FOREIGN KEY (authored_by_id) REFERENCES shadowvale.users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_content_versions_users_published_by_id FOREIGN KEY (published_by_id) REFERENCES shadowvale.users (id) ON DELETE RESTRICT,
        CONSTRAINT fk_content_versions_users_reviewed_by_id FOREIGN KEY (reviewed_by_id) REFERENCES shadowvale.users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.players (
        id uuid NOT NULL,
        install_id uuid NOT NULL,
        last_seen_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_players PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.solver_configurations (
        id uuid NOT NULL,
        code character varying(64) NOT NULL,
        name character varying(100) NOT NULL,
        algorithm character varying(30) NOT NULL,
        family character varying(30) NOT NULL,
        library character varying(50),
        params jsonb NOT NULL,
        qubo_weights jsonb NOT NULL,
        time_budget_ms integer NOT NULL,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_solver_configurations PRIMARY KEY (id),
        CONSTRAINT ck_solver_configurations_family CHECK ((family = 'Classical') = (algorithm IN ('Greedy', 'Genetic', 'ClassicalSa')) AND (family = 'QuantumHardware') = (algorithm = 'QpuDwave')),
        CONSTRAINT ck_solver_configurations_time_budget CHECK (time_budget_ms > 0)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.content_publication_history (
        id uuid NOT NULL,
        content_version_id uuid NOT NULL,
        previous_version_id uuid,
        action character varying(30) NOT NULL,
        actor_id uuid,
        reason character varying(500) NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_content_publication_history PRIMARY KEY (id),
        CONSTRAINT fk_content_publication_history_content_versions_content_versio FOREIGN KEY (content_version_id) REFERENCES shadowvale.content_versions (id) ON DELETE RESTRICT,
        CONSTRAINT fk_content_publication_history_content_versions_previous_versi FOREIGN KEY (previous_version_id) REFERENCES shadowvale.content_versions (id) ON DELETE RESTRICT,
        CONSTRAINT fk_content_publication_history_users_actor_id FOREIGN KEY (actor_id) REFERENCES shadowvale.users (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.items (
        id uuid NOT NULL,
        name character varying(100) NOT NULL,
        description character varying(1000),
        type character varying(30) NOT NULL,
        rarity character varying(30) NOT NULL,
        max_stack integer NOT NULL,
        weight numeric(6,2) NOT NULL,
        base_value integer NOT NULL,
        stats jsonb NOT NULL,
        icon_key character varying(200),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        content_version_id uuid NOT NULL,
        code character varying(64) NOT NULL,
        CONSTRAINT pk_items PRIMARY KEY (id),
        CONSTRAINT ck_items_base_value CHECK (base_value >= 0),
        CONSTRAINT ck_items_max_stack CHECK (max_stack >= 1),
        CONSTRAINT ck_items_weapon_not_stackable CHECK (type <> 'Weapon' OR max_stack = 1),
        CONSTRAINT ck_items_weight CHECK (weight >= 0),
        CONSTRAINT fk_items_content_versions_content_version_id FOREIGN KEY (content_version_id) REFERENCES shadowvale.content_versions (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.loot_tables (
        id uuid NOT NULL,
        name character varying(100) NOT NULL,
        rolls_min integer NOT NULL,
        rolls_max integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        content_version_id uuid NOT NULL,
        code character varying(64) NOT NULL,
        CONSTRAINT pk_loot_tables PRIMARY KEY (id),
        CONSTRAINT ck_loot_tables_rolls_min CHECK (rolls_min >= 0),
        CONSTRAINT ck_loot_tables_rolls_range CHECK (rolls_max >= rolls_min),
        CONSTRAINT fk_loot_tables_content_versions_content_version_id FOREIGN KEY (content_version_id) REFERENCES shadowvale.content_versions (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.maps (
        id uuid NOT NULL,
        name character varying(100) NOT NULL,
        scene_key character varying(100) NOT NULL,
        is_safe_camp boolean NOT NULL,
        sort_order integer NOT NULL,
        nav_graph jsonb NOT NULL,
        layout jsonb NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        content_version_id uuid NOT NULL,
        code character varying(64) NOT NULL,
        CONSTRAINT pk_maps PRIMARY KEY (id),
        CONSTRAINT fk_maps_content_versions_content_version_id FOREIGN KEY (content_version_id) REFERENCES shadowvale.content_versions (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.quests (
        id uuid NOT NULL,
        title character varying(200) NOT NULL,
        description character varying(2000),
        is_main boolean NOT NULL,
        sort_order integer NOT NULL,
        objectives jsonb NOT NULL,
        prerequisites text[] NOT NULL,
        reward_xp integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        content_version_id uuid NOT NULL,
        code character varying(64) NOT NULL,
        CONSTRAINT pk_quests PRIMARY KEY (id),
        CONSTRAINT ck_quests_reward_xp CHECK (reward_xp >= 0),
        CONSTRAINT fk_quests_content_versions_content_version_id FOREIGN KEY (content_version_id) REFERENCES shadowvale.content_versions (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.skills (
        id uuid NOT NULL,
        name character varying(100) NOT NULL,
        type character varying(30) NOT NULL,
        max_level integer NOT NULL,
        xp_curve jsonb NOT NULL,
        effects jsonb NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        content_version_id uuid NOT NULL,
        code character varying(64) NOT NULL,
        CONSTRAINT pk_skills PRIMARY KEY (id),
        CONSTRAINT ck_skills_max_level CHECK (max_level > 0),
        CONSTRAINT fk_skills_content_versions_content_version_id FOREIGN KEY (content_version_id) REFERENCES shadowvale.content_versions (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.game_sessions (
        id uuid NOT NULL,
        player_id uuid,
        content_version_id uuid NOT NULL,
        started_at timestamp with time zone NOT NULL,
        ended_at timestamp with time zone,
        outcome character varying(30) NOT NULL,
        client_version character varying(50),
        platform character varying(20) NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_game_sessions PRIMARY KEY (id),
        CONSTRAINT ck_game_sessions_ended_after_started CHECK (ended_at IS NULL OR ended_at >= started_at),
        CONSTRAINT fk_game_sessions_content_versions_content_version_id FOREIGN KEY (content_version_id) REFERENCES shadowvale.content_versions (id) ON DELETE RESTRICT,
        CONSTRAINT fk_game_sessions_players_player_id FOREIGN KEY (player_id) REFERENCES shadowvale.players (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.consumables (
        id uuid NOT NULL,
        item_id uuid NOT NULL,
        heal_hp integer NOT NULL,
        restore_stamina integer NOT NULL,
        use_time_seconds numeric(5,2) NOT NULL,
        cures text[] NOT NULL,
        extra_effects jsonb NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_consumables PRIMARY KEY (id),
        CONSTRAINT ck_consumables_heal_hp CHECK (heal_hp >= 0),
        CONSTRAINT ck_consumables_restore_stamina CHECK (restore_stamina >= 0),
        CONSTRAINT ck_consumables_use_time CHECK (use_time_seconds >= 0),
        CONSTRAINT fk_consumables_items_item_id FOREIGN KEY (item_id) REFERENCES shadowvale.items (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.weapons (
        id uuid NOT NULL,
        item_id uuid NOT NULL,
        class character varying(30) NOT NULL,
        damage numeric(7,2) NOT NULL,
        fire_rate numeric(6,2) NOT NULL,
        effective_range numeric(6,2) NOT NULL,
        magazine_size integer,
        reload_time_seconds numeric(5,2),
        ammo_item_id uuid,
        max_durability integer NOT NULL,
        durability_per_use numeric(6,3) NOT NULL,
        noise_radius numeric(6,2) NOT NULL,
        is_suppressed boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_weapons PRIMARY KEY (id),
        CONSTRAINT ck_weapons_damage CHECK (damage > 0),
        CONSTRAINT ck_weapons_effective_range CHECK (effective_range >= 0),
        CONSTRAINT ck_weapons_fire_rate CHECK (fire_rate > 0),
        CONSTRAINT ck_weapons_magazine_size CHECK (magazine_size IS NULL OR magazine_size >= 1),
        CONSTRAINT ck_weapons_max_durability CHECK (max_durability > 0),
        CONSTRAINT ck_weapons_melee_no_ammo CHECK (class <> 'Melee' OR (ammo_item_id IS NULL AND magazine_size IS NULL)),
        CONSTRAINT ck_weapons_noise_radius CHECK (noise_radius >= 0),
        CONSTRAINT fk_weapons_items_ammo_item_id FOREIGN KEY (ammo_item_id) REFERENCES shadowvale.items (id) ON DELETE SET NULL,
        CONSTRAINT fk_weapons_items_item_id FOREIGN KEY (item_id) REFERENCES shadowvale.items (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.loot_table_entries (
        id uuid NOT NULL,
        loot_table_id uuid NOT NULL,
        item_id uuid NOT NULL,
        tier smallint NOT NULL,
        weight numeric(10,4) NOT NULL,
        min_quantity integer NOT NULL,
        max_quantity integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_loot_table_entries PRIMARY KEY (id),
        CONSTRAINT ck_loot_table_entries_quantity CHECK (min_quantity >= 1 AND max_quantity >= min_quantity),
        CONSTRAINT ck_loot_table_entries_tier CHECK (tier BETWEEN 1 AND 5),
        CONSTRAINT ck_loot_table_entries_weight CHECK (weight > 0),
        CONSTRAINT fk_loot_table_entries_items_item_id FOREIGN KEY (item_id) REFERENCES shadowvale.items (id) ON DELETE CASCADE,
        CONSTRAINT fk_loot_table_entries_loot_tables_loot_table_id FOREIGN KEY (loot_table_id) REFERENCES shadowvale.loot_tables (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.map_loot_tables (
        id uuid NOT NULL,
        map_id uuid NOT NULL,
        loot_table_id uuid NOT NULL,
        container_tag character varying(50) NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_map_loot_tables PRIMARY KEY (id),
        CONSTRAINT fk_map_loot_tables_loot_tables_loot_table_id FOREIGN KEY (loot_table_id) REFERENCES shadowvale.loot_tables (id) ON DELETE CASCADE,
        CONSTRAINT fk_map_loot_tables_maps_map_id FOREIGN KEY (map_id) REFERENCES shadowvale.maps (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.quest_rewards (
        id uuid NOT NULL,
        quest_id uuid NOT NULL,
        item_id uuid NOT NULL,
        quantity integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_quest_rewards PRIMARY KEY (id),
        CONSTRAINT ck_quest_rewards_quantity CHECK (quantity > 0),
        CONSTRAINT fk_quest_rewards_items_item_id FOREIGN KEY (item_id) REFERENCES shadowvale.items (id) ON DELETE CASCADE,
        CONSTRAINT fk_quest_rewards_quests_quest_id FOREIGN KEY (quest_id) REFERENCES shadowvale.quests (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.crafting_recipes (
        id uuid NOT NULL,
        name character varying(100) NOT NULL,
        output_item_id uuid NOT NULL,
        output_quantity integer NOT NULL,
        craft_time_seconds numeric(6,2) NOT NULL,
        required_skill_id uuid,
        required_skill_level integer NOT NULL,
        station character varying(50) NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        content_version_id uuid NOT NULL,
        code character varying(64) NOT NULL,
        CONSTRAINT pk_crafting_recipes PRIMARY KEY (id),
        CONSTRAINT ck_crafting_recipes_craft_time CHECK (craft_time_seconds >= 0),
        CONSTRAINT ck_crafting_recipes_output_quantity CHECK (output_quantity > 0),
        CONSTRAINT ck_crafting_recipes_skill_level CHECK (required_skill_level >= 0),
        CONSTRAINT fk_crafting_recipes_content_versions_content_version_id FOREIGN KEY (content_version_id) REFERENCES shadowvale.content_versions (id) ON DELETE CASCADE,
        CONSTRAINT fk_crafting_recipes_items_output_item_id FOREIGN KEY (output_item_id) REFERENCES shadowvale.items (id) ON DELETE CASCADE,
        CONSTRAINT fk_crafting_recipes_skills_required_skill_id FOREIGN KEY (required_skill_id) REFERENCES shadowvale.skills (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.coordination_results (
        id uuid NOT NULL,
        session_id uuid NOT NULL,
        solver_configuration_id uuid NOT NULL,
        map_code character varying(64),
        squad_tag character varying(50),
        task_type character varying(30) NOT NULL,
        num_agents integer NOT NULL,
        num_nodes integer NOT NULL,
        num_qubo_vars integer,
        objective_value double precision,
        solve_latency_ms double precision NOT NULL,
        within_budget boolean NOT NULL,
        used_fallback boolean NOT NULL,
        assignment jsonb,
        coordination_score double precision,
        encounter_outcome character varying(30),
        escape_time_ms double precision,
        triggered_at timestamp with time zone NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_coordination_results PRIMARY KEY (id),
        CONSTRAINT ck_coordination_results_latency CHECK (solve_latency_ms >= 0),
        CONSTRAINT ck_coordination_results_num_agents CHECK (num_agents > 0),
        CONSTRAINT ck_coordination_results_num_nodes CHECK (num_nodes > 0),
        CONSTRAINT fk_coordination_results_game_sessions_session_id FOREIGN KEY (session_id) REFERENCES shadowvale.game_sessions (id) ON DELETE CASCADE,
        CONSTRAINT fk_coordination_results_solver_configurations_solver_configura FOREIGN KEY (solver_configuration_id) REFERENCES shadowvale.solver_configurations (id) ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.telemetry_events (
        id bigint GENERATED ALWAYS AS IDENTITY,
        session_id uuid NOT NULL,
        client_event_id uuid NOT NULL,
        event_type character varying(50) NOT NULL,
        map_code character varying(64),
        pos_x real,
        pos_y real,
        occurred_at timestamp with time zone NOT NULL,
        payload jsonb NOT NULL,
        received_at timestamp with time zone NOT NULL DEFAULT (now()),
        CONSTRAINT pk_telemetry_events PRIMARY KEY (id),
        CONSTRAINT fk_telemetry_events_game_sessions_session_id FOREIGN KEY (session_id) REFERENCES shadowvale.game_sessions (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.enemy_types (
        id uuid NOT NULL,
        name character varying(100) NOT NULL,
        archetype character varying(50) NOT NULL,
        is_boss boolean NOT NULL,
        max_hp integer NOT NULL,
        move_speed numeric(5,2) NOT NULL,
        vision_range numeric(6,2) NOT NULL,
        vision_angle_degrees numeric(5,2) NOT NULL,
        hearing_range numeric(6,2) NOT NULL,
        accuracy numeric(4,3) NOT NULL,
        weapon_id uuid,
        fsm_params jsonb NOT NULL,
        loot_table_id uuid,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        content_version_id uuid NOT NULL,
        code character varying(64) NOT NULL,
        CONSTRAINT pk_enemy_types PRIMARY KEY (id),
        CONSTRAINT ck_enemy_types_accuracy CHECK (accuracy BETWEEN 0 AND 1),
        CONSTRAINT ck_enemy_types_max_hp CHECK (max_hp > 0),
        CONSTRAINT ck_enemy_types_move_speed CHECK (move_speed > 0),
        CONSTRAINT ck_enemy_types_vision_angle CHECK (vision_angle_degrees BETWEEN 0 AND 360),
        CONSTRAINT fk_enemy_types_content_versions_content_version_id FOREIGN KEY (content_version_id) REFERENCES shadowvale.content_versions (id) ON DELETE CASCADE,
        CONSTRAINT fk_enemy_types_loot_tables_loot_table_id FOREIGN KEY (loot_table_id) REFERENCES shadowvale.loot_tables (id) ON DELETE SET NULL,
        CONSTRAINT fk_enemy_types_weapons_weapon_id FOREIGN KEY (weapon_id) REFERENCES shadowvale.weapons (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.crafting_recipe_ingredients (
        id uuid NOT NULL,
        recipe_id uuid NOT NULL,
        item_id uuid NOT NULL,
        quantity integer NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_crafting_recipe_ingredients PRIMARY KEY (id),
        CONSTRAINT ck_crafting_recipe_ingredients_quantity CHECK (quantity > 0),
        CONSTRAINT fk_crafting_recipe_ingredients_crafting_recipes_recipe_id FOREIGN KEY (recipe_id) REFERENCES shadowvale.crafting_recipes (id) ON DELETE CASCADE,
        CONSTRAINT fk_crafting_recipe_ingredients_items_item_id FOREIGN KEY (item_id) REFERENCES shadowvale.items (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE TABLE shadowvale.enemy_placements (
        id uuid NOT NULL,
        map_id uuid NOT NULL,
        enemy_type_id uuid NOT NULL,
        squad_tag character varying(50) NOT NULL,
        pos_x numeric(9,3) NOT NULL,
        pos_y numeric(9,3) NOT NULL,
        facing_degrees numeric(5,2) NOT NULL,
        patrol_route jsonb NOT NULL,
        spawn_condition jsonb,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT pk_enemy_placements PRIMARY KEY (id),
        CONSTRAINT fk_enemy_placements_enemy_types_enemy_type_id FOREIGN KEY (enemy_type_id) REFERENCES shadowvale.enemy_types (id) ON DELETE CASCADE,
        CONSTRAINT fk_enemy_placements_maps_map_id FOREIGN KEY (map_id) REFERENCES shadowvale.maps (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_consumables_item_id ON shadowvale.consumables (item_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_content_publication_history_actor_id ON shadowvale.content_publication_history (actor_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_content_publication_history_content_version_id ON shadowvale.content_publication_history (content_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_content_publication_history_created_at ON shadowvale.content_publication_history (created_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_content_publication_history_previous_version_id ON shadowvale.content_publication_history (previous_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_content_versions_authored_by_id ON shadowvale.content_versions (authored_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_content_versions_parent_version_id ON shadowvale.content_versions (parent_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_content_versions_published_by_id ON shadowvale.content_versions (published_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_content_versions_reviewed_by_id ON shadowvale.content_versions (reviewed_by_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_content_versions_status ON shadowvale.content_versions (status);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_content_versions_version_no ON shadowvale.content_versions (version_no);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ux_content_versions_one_published ON shadowvale.content_versions (status) WHERE status = 'Published';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_coordination_results_session_id ON shadowvale.coordination_results (session_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_coordination_results_solver_configuration_id ON shadowvale.coordination_results (solver_configuration_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_crafting_recipe_ingredients_item_id ON shadowvale.crafting_recipe_ingredients (item_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_crafting_recipe_ingredients_recipe_id_item_id ON shadowvale.crafting_recipe_ingredients (recipe_id, item_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_crafting_recipes_content_version_id_code ON shadowvale.crafting_recipes (content_version_id, code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_crafting_recipes_output_item_id ON shadowvale.crafting_recipes (output_item_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_crafting_recipes_required_skill_id ON shadowvale.crafting_recipes (required_skill_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_enemy_placements_enemy_type_id ON shadowvale.enemy_placements (enemy_type_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_enemy_placements_map_id ON shadowvale.enemy_placements (map_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_enemy_types_content_version_id_code ON shadowvale.enemy_types (content_version_id, code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_enemy_types_loot_table_id ON shadowvale.enemy_types (loot_table_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_enemy_types_weapon_id ON shadowvale.enemy_types (weapon_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_game_sessions_content_version_id ON shadowvale.game_sessions (content_version_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_game_sessions_player_id ON shadowvale.game_sessions (player_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_game_sessions_started_at ON shadowvale.game_sessions (started_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_items_content_version_id_code ON shadowvale.items (content_version_id, code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_loot_table_entries_item_id ON shadowvale.loot_table_entries (item_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_loot_table_entries_loot_table_id_item_id_tier ON shadowvale.loot_table_entries (loot_table_id, item_id, tier);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_loot_tables_content_version_id_code ON shadowvale.loot_tables (content_version_id, code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_map_loot_tables_loot_table_id ON shadowvale.map_loot_tables (loot_table_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_map_loot_tables_map_id_loot_table_id_container_tag ON shadowvale.map_loot_tables (map_id, loot_table_id, container_tag);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_maps_content_version_id_code ON shadowvale.maps (content_version_id, code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_players_install_id ON shadowvale.players (install_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_quest_rewards_item_id ON shadowvale.quest_rewards (item_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_quest_rewards_quest_id_item_id ON shadowvale.quest_rewards (quest_id, item_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_quests_content_version_id_code ON shadowvale.quests (content_version_id, code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_skills_content_version_id_code ON shadowvale.skills (content_version_id, code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_solver_configurations_code ON shadowvale.solver_configurations (code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_telemetry_events_event_type_occurred_at ON shadowvale.telemetry_events (event_type, occurred_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_telemetry_events_map_code ON shadowvale.telemetry_events (map_code) WHERE map_code IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_telemetry_events_occurred_at ON shadowvale.telemetry_events USING brin (occurred_at);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_telemetry_events_session_id_client_event_id ON shadowvale.telemetry_events (session_id, client_event_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE INDEX ix_weapons_ammo_item_id ON shadowvale.weapons (ammo_item_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    CREATE UNIQUE INDEX ix_weapons_item_id ON shadowvale.weapons (item_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261008175804_ContentAndTelemetry') THEN
    INSERT INTO shadowvale.__ef_migrations_history (migration_id, product_version)
    VALUES ('20261008175804_ContentAndTelemetry', '10.0.12');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    UPDATE shadowvale.solver_configurations SET algorithm = 'Qaoa' WHERE algorithm = 'QaoaAer';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    UPDATE shadowvale.solver_configurations SET algorithm = 'Sqa' WHERE algorithm = 'SqaNeal';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    ALTER TABLE shadowvale.coordination_results DROP COLUMN encounter_outcome;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    ALTER TABLE shadowvale.coordination_results DROP COLUMN escape_time_ms;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    ALTER TABLE shadowvale.game_sessions ALTER COLUMN content_version_id DROP NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    ALTER TABLE shadowvale.game_sessions ADD map_code character varying(64);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    ALTER TABLE shadowvale.game_sessions ADD solver_configuration_id uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    ALTER TABLE shadowvale.game_sessions ADD source character varying(10) NOT NULL DEFAULT 'human';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    ALTER TABLE shadowvale.game_sessions ADD stats jsonb NOT NULL DEFAULT ('{}'::jsonb);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    CREATE INDEX ix_game_sessions_map_code ON shadowvale.game_sessions (map_code);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    CREATE INDEX ix_game_sessions_solver_configuration_id ON shadowvale.game_sessions (solver_configuration_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    CREATE INDEX ix_game_sessions_source ON shadowvale.game_sessions (source);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    ALTER TABLE shadowvale.game_sessions ADD CONSTRAINT ck_game_sessions_source CHECK (source IN ('human', 'replay'));
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    ALTER TABLE shadowvale.game_sessions ADD CONSTRAINT fk_game_sessions_solver_configurations_solver_configuration_id FOREIGN KEY (solver_configuration_id) REFERENCES shadowvale.solver_configurations (id) ON DELETE RESTRICT;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261009092126_GameTelemetryAnalytics') THEN
    INSERT INTO shadowvale.__ef_migrations_history (migration_id, product_version)
    VALUES ('20261009092126_GameTelemetryAnalytics', '10.0.12');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261012000000_AllowArchivingUnvalidatedDrafts') THEN
    ALTER TABLE shadowvale.content_versions DROP CONSTRAINT ck_content_versions_published_has_bundle;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261012000000_AllowArchivingUnvalidatedDrafts') THEN
    ALTER TABLE shadowvale.content_versions ADD CONSTRAINT ck_content_versions_published_has_bundle CHECK ((status <> 'Published' AND (status <> 'Archived' OR published_at IS NULL)) OR (bundle IS NOT NULL AND bundle_checksum IS NOT NULL));
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261012000000_AllowArchivingUnvalidatedDrafts') THEN
    INSERT INTO shadowvale.__ef_migrations_history (migration_id, product_version)
    VALUES ('20261012000000_AllowArchivingUnvalidatedDrafts', '10.0.12');
    END IF;
END $EF$;
COMMIT;

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261028163454_AddTabuSolver') THEN
    ALTER TABLE shadowvale.solver_configurations DROP CONSTRAINT ck_solver_configurations_family;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261028163454_AddTabuSolver') THEN
    ALTER TABLE shadowvale.solver_configurations ADD CONSTRAINT ck_solver_configurations_family CHECK ((family = 'Classical') = (algorithm IN ('Greedy', 'Genetic', 'ClassicalSa', 'Tabu')) AND (family = 'QuantumHardware') = (algorithm = 'QpuDwave'));
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261028163454_AddTabuSolver') THEN
    INSERT INTO shadowvale.solver_configurations
        (id, code, name, algorithm, family, library, params, qubo_weights, time_budget_ms, is_active, created_at, updated_at)
    SELECT gen_random_uuid(), 'tabu', 'Tabu search (tuned)', 'Tabu', 'Classical', 'custom', '{}'::jsonb,
           '{"penalty_conflict": 0, "weight_cover": 0.5, "weight_coverage": 1, "weight_distance": 0.1, "weight_flanking": 1, "weight_redundancy": 0.5}'::jsonb,
           120, false, now(), now()
    WHERE EXISTS (SELECT 1 FROM shadowvale.solver_configurations)
      AND NOT EXISTS (SELECT 1 FROM shadowvale.solver_configurations WHERE code = 'tabu');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM shadowvale.__ef_migrations_history WHERE "migration_id" = '20261028163454_AddTabuSolver') THEN
    INSERT INTO shadowvale.__ef_migrations_history (migration_id, product_version)
    VALUES ('20261028163454_AddTabuSolver', '10.0.12');
    END IF;
END $EF$;
COMMIT;
