using System.Globalization;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

// Reads the files the game plays with today and maps them onto schema 1.0:
//   _Project/Map01/Generated/Map01Content.json      items, weapons, enemy archetypes (+ boss profile), recipes, tier loot tables
//   _Project/Map01/Resources/Loot/Map01Loot.json    item rarity/value, Map 1 enemy types, loot tables and containers
//   _Project/Map01/Map01Balance.json                medkit heal, guard accuracy
//   Resources/Skills/SkillBalance.json              skill thresholds and multipliers
//   _Project/Resources/TacticalGraphs/*.nav_graph.json   maps
//   _Project/Map01/Runtime/Map01Quest.cs            Map 1 stage ids (the quest objectives, indexed like objective_completed)
// Every value the game does not have is listed as a note, so a designer can review it on the web.
public static class GameContentConverter
{
    // Map code the game reports in telemetry, keyed by the nav graph's scene name
    private static readonly (string Scene, string Code, bool SafeCamp)[] Maps =
    [
        ("Map00_Tutorial", "map00_tutorial", false),
        // The Safe Camp hub (quest NPC, crafting, storage, save) is inside Map 1
        ("Map 1", "map01", true),
        ("Map 2", "map02", false)
    ];

    // Perception of the Map 1 enemy types comes from the archetype they play as
    private static readonly Dictionary<string, string> PerceptionFrom = new() { ["rifleman"] = "grunt", ["boss"] = "boss_commander" };

    public static (JsonObject Bundle, List<string> Notes) Convert(string assets)
    {
        var notes = new List<string>();
        var content = Read(assets, "_Project/Map01/Generated/Map01Content.json");
        var loot = Read(assets, "_Project/Map01/Resources/Loot/Map01Loot.json");
        var balance = Read(assets, "_Project/Map01/Map01Balance.json");
        var skillBalance = Read(assets, "Resources/Skills/SkillBalance.json");

        var contentItems = Rows(content, "items").ToDictionary(i => Str(i, "id"));
        var lootItems = Rows(loot, "items").ToDictionary(i => Str(i, "code"));
        var weapons = Rows(content, "weapons").ToDictionary(w => Str(w, "id"));

        // ---------- items, weapons, consumables ----------
        var items = new JsonArray();
        var weaponRows = new JsonArray();
        var consumables = new JsonArray();
        var codes = contentItems.Keys.Concat(lootItems.Keys).Concat(weapons.Keys).Distinct().Order(StringComparer.Ordinal);
        foreach (var code in codes)
        {
            contentItems.TryGetValue(code, out var c);
            lootItems.TryGetValue(code, out var l);
            weapons.TryGetValue(code, out var w);

            var type = c is not null ? Str(c, "category")
                : l is not null ? Snake(Str(l, "type"))
                : "weapon";
            var name = c is not null ? Str(c, "display_name") : w is not null ? Str(w, "display_name") : Title(code);
            if (c is null && w is null)
                notes.Add($"item {code}: no display name in the game, named \"{name}\"");
            double? weight = c is not null ? Num(c, "weight") : l is not null ? Num(l, "weight") : null;
            if (weight is null)
                notes.Add($"item {code}: no weight in the game, set to 0");
            var maxStack = c is not null ? Int(c, "stack_max") : type switch { "weapon" => 1, "ammo" => 99, _ => 64 };
            if (c is null)
                notes.Add($"item {code}: no stack size in the game, set to {maxStack}");

            // Salvage and condition rules of Map01Loot have no column; they stay with the item
            var stats = new JsonObject();
            if (l is not null)
                foreach (var (key, value) in l.AsObject())
                    if (key is not ("code" or "type" or "rarity" or "baseValue" or "weight"))
                        stats[Snake(key)] = value?.DeepClone();

            items.Add(new JsonObject
            {
                ["code"] = code,
                ["name"] = name,
                ["description"] = null,
                ["item_type"] = type,
                ["rarity"] = l is not null ? Str(l, "rarity").ToLowerInvariant() : "common",
                ["max_stack"] = maxStack,
                ["weight"] = Round(weight ?? 0, 2),
                ["base_value"] = l is not null ? Int(l, "baseValue") : 0,
                ["stats"] = stats,
                ["icon_key"] = null
            });

            if (type == "weapon")
                weaponRows.Add(Weapon(code, w, notes));
            if (type == "consumable")
                consumables.Add(Consumable(code, balance, notes));
        }

        // ---------- skills ----------
        var skills = new JsonArray
        {
            Skill("shooting", "Shooting", skillBalance, "shootingThresholds", "recoilMultipliers", "reloadMultipliers"),
            Skill("engineering", "Engineering", skillBalance, "engineeringThresholds", "repairBonusFractions", "fieldRepairCaps"),
            Skill("stealth", "Stealth", skillBalance, "stealthThresholds", "takedownMultipliers")
        };

        // ---------- loot tables ----------
        var lootTables = new JsonArray();
        var lootEntries = new JsonArray();
        foreach (var table in Rows(content, "loot_tables"))
        {
            var code = Str(table, "id");
            var rolls = Int(table, "rolls");
            lootTables.Add(new JsonObject { ["code"] = code, ["name"] = $"Tier {Int(table, "tier")} loot", ["rolls_min"] = rolls, ["rolls_max"] = rolls });
            foreach (var entry in Rows(table, "entries"))
                lootEntries.Add(LootEntry(code, Str(entry, "item_id"), Int(table, "tier"), Num(entry, "weight")!.Value, Int(entry, "min"), Int(entry, "max")));
        }
        foreach (var table in Rows(loot, "lootTables"))
        {
            var code = Str(table, "code");
            lootTables.Add(new JsonObject { ["code"] = code, ["name"] = Str(table, "name"), ["rolls_min"] = Int(table, "rollsMin"), ["rolls_max"] = Int(table, "rollsMax") });
            foreach (var entry in Rows(table, "entries"))
                lootEntries.Add(LootEntry(code, Str(entry, "item"), Int(entry, "tier"), Num(entry, "weight")!.Value, Int(entry, "min"), Int(entry, "max")));
        }

        // ---------- enemy types ----------
        var accuracyProfile = balance["guardAccuracy"]!.DeepClone();
        var accuracy = Num(balance["guardAccuracy"]!, "closeHit")!.Value;
        notes.Add($"enemy types: accuracy = guardAccuracy.closeHit ({accuracy}); the whole distance curve is kept in fsm_params.accuracy");
        var archetypes = Rows(content, "enemy_archetypes").ToDictionary(a => Str(a, "id"));
        var enemyTypes = new JsonArray();
        foreach (var a in archetypes.Values)
            enemyTypes.Add(Enemy(Str(a, "id"), Str(a, "display_name"), Str(a, "id"), a["is_boss"]!.GetValue<bool>(), Int(a, "max_hp"),
                a, accuracy, accuracyProfile, StrOrNull(a, "weapon_id"), StrOrNull(a, "loot_table_id"), extra: null));
        foreach (var e in Rows(loot, "enemyTypes"))
        {
            var code = Str(e, "code");
            var from = archetypes[PerceptionFrom[Str(e, "archetype")]];
            notes.Add($"enemy {code}: speed, vision, hearing and FSM timings taken from archetype {Str(from, "id")}");
            var extra = new JsonObject
            {
                ["drop_min"] = Num(e, "dropMin"), ["drop_max"] = Num(e, "dropMax"),
                ["sidearm"] = Str(e, "sidearm") is { Length: > 0 } s ? s : null,
                ["sidearm_min"] = Num(e, "sidearmMin"), ["sidearm_max"] = Num(e, "sidearmMax")
            };
            enemyTypes.Add(Enemy(code, Str(e, "name"), Str(e, "archetype"), e["boss"]!.GetValue<bool>(), Int(e, "maxHp"),
                from, accuracy, accuracyProfile, Str(e, "weapon"), Str(e, "lootTable"), extra));
        }

        // ---------- maps ----------
        var maps = new JsonArray();
        var mapLootTables = new JsonArray();
        for (var i = 0; i < Maps.Length; i++)
        {
            var (scene, code, safeCamp) = Maps[i];
            var graph = Read(assets, $"_Project/Resources/TacticalGraphs/{scene}.nav_graph.json");
            maps.Add(new JsonObject
            {
                ["code"] = code,
                ["name"] = Str(graph, "display_name"),
                ["scene_key"] = Str(graph, "scene_name"),
                ["is_safe_camp"] = safeCamp,
                ["sort_order"] = i,
                ["nav_graph"] = new JsonObject { ["nodes"] = graph["nav_graph_nodes"]!.DeepClone(), ["escape_routes"] = graph["escape_routes"]!.DeepClone() },
                ["layout"] = new JsonObject { ["player_start_node"] = graph["player_start_node"]!.DeepClone() }
            });
        }
        foreach (var container in Rows(loot, "containers"))
            mapLootTables.Add(new JsonObject { ["map_code"] = "map01", ["loot_table_code"] = Str(container, "lootTable"), ["container_tag"] = Str(container, "tag") });
        notes.Add("maps: enemy placements stay in the scenes (the nav graphs have no spawn groups), so enemy_placements is empty");

        // ---------- crafting ----------
        var recipes = new JsonArray();
        var ingredients = new JsonArray();
        foreach (var r in Rows(content, "craft_recipes"))
        {
            var code = Str(r, "id");
            var output = Str(r, "output_item_id");
            var field = r["field_seconds"] is not null;
            recipes.Add(new JsonObject
            {
                ["code"] = code,
                ["name"] = $"{(field ? "Field craft" : "Craft")}: {Str(contentItems[output], "display_name")}",
                ["output_item_code"] = output,
                ["output_quantity"] = Int(r, "output_count"),
                ["craft_time_s"] = Round(Num(r, "craft_seconds")!.Value, 2),
                ["required_skill_code"] = StrOrNull(r, "required_skill"),
                ["required_skill_level"] = r["required_skill_level"] is null ? 0 : Int(r, "required_skill_level"),
                ["station"] = field ? "field" : "workbench"
            });
            foreach (var input in Rows(r, "inputs"))
                ingredients.Add(new JsonObject { ["recipe_code"] = code, ["item_code"] = Str(input, "item_id"), ["quantity"] = Int(input, "count") });
        }
        notes.Add("recipes: field_seconds and field_max_batch have no column and stay in the game; recipes that have them use station \"field\"");

        // ---------- quests ----------
        var stageIds = StageIds(assets);
        var objectives = new JsonArray();
        foreach (var id in stageIds)
            objectives.Add(new JsonObject { ["id"] = id, ["type"] = "stage", ["target_id"] = id, ["count"] = 1 });
        var quests = new JsonArray
        {
            new JsonObject
            {
                ["code"] = "map01_main", ["title"] = "Map 1 main operation", ["description"] = null, ["is_main"] = true, ["sort_order"] = 0,
                ["objectives"] = objectives, ["prerequisites"] = new JsonArray(), ["reward_xp"] = 0
            }
        };
        notes.Add($"quests: map01_main has the {stageIds.Count} Map 1 stages as objectives (array index = objective_completed payload.index); the tutorial and Map 2 chapters are not data yet");
        notes.Add("quests: the legacy docks quest and map01_docks map in Map01Content are not imported (no such scene)");

        var bundle = new JsonObject
        {
            ["version_no"] = 1,
            ["label"] = "Game content import",
            ["schema_version"] = "1.0",
            ["changelog"] = "Content the game shipped with: Map01Content, Map01Loot, SkillBalance, nav graphs and Map 1 stages.",
            ["items"] = items,
            ["weapons"] = weaponRows,
            ["consumables"] = consumables,
            ["skills"] = skills,
            ["loot_tables"] = lootTables,
            ["loot_table_entries"] = lootEntries,
            ["maps"] = maps,
            ["map_loot_tables"] = mapLootTables,
            ["enemy_types"] = enemyTypes,
            ["enemy_placements"] = new JsonArray(),
            ["crafting_recipes"] = recipes,
            ["crafting_recipe_ingredients"] = ingredients,
            ["quests"] = quests,
            ["quest_rewards"] = new JsonArray()
        };
        return (bundle, notes);
    }

    private static JsonObject Weapon(string code, JsonNode? w, List<string> notes)
    {
        if (w is null)
        {
            // Map01Loot lists the knife as a weapon, but the game has no stats for it (takedowns are scripted)
            notes.Add($"weapon {code}: no stats in the game; set as a silent melee weapon (damage 100, range 1.5 m) to review on the web");
            return new JsonObject
            {
                ["item_code"] = code, ["item_type"] = "weapon", ["weapon_class"] = "melee", ["damage"] = 100.0, ["fire_rate"] = 1.0,
                ["effective_range"] = 1.5, ["magazine_size"] = null, ["reload_time_s"] = null, ["ammo_item_code"] = null, ["ammo_type"] = "ammo",
                ["max_durability"] = 100, ["durability_per_use"] = 0.0, ["noise_radius"] = 0.0, ["is_suppressed"] = true
            };
        }

        var weaponClass = Str(w, "class");
        if (weaponClass == "carbine")
        {
            notes.Add($"weapon {code}: class \"carbine\" is not in the schema, imported as \"rifle\"");
            weaponClass = "rifle";
        }
        return new JsonObject
        {
            ["item_code"] = code,
            ["item_type"] = "weapon",
            ["weapon_class"] = weaponClass,
            ["damage"] = Round(Num(w, "damage")!.Value, 2),
            ["fire_rate"] = Round(Num(w, "fire_rate")!.Value, 2),
            ["effective_range"] = Round(Num(w, "range")!.Value, 2),
            ["magazine_size"] = Int(w, "magazine_size"),
            ["reload_time_s"] = Round(Num(w, "reload_seconds")!.Value, 2),
            ["ammo_item_code"] = Str(w, "ammo_type"),
            ["ammo_type"] = "ammo",
            ["max_durability"] = Int(w, "durability_max"),
            ["durability_per_use"] = Round(Num(w, "durability_per_shot")!.Value, 3),
            ["noise_radius"] = Round(Num(w, "noise_radius")!.Value, 2),
            ["is_suppressed"] = w["suppressed"]!.GetValue<bool>()
        };
    }

    private static JsonObject Consumable(string code, JsonNode balance, List<string> notes)
    {
        var heal = code == "medkit_small" ? Int(balance, "medkitHeal") : 0;
        notes.Add(code == "medkit_small"
            ? $"consumable {code}: heal_hp = Map01Balance.medkitHeal ({heal}); use time not in the game, set to 0"
            : $"consumable {code}: thrown or used for noise, no heal; use time not in the game, set to 0");
        return new JsonObject
        {
            ["item_code"] = code, ["item_type"] = "consumable", ["heal_hp"] = heal, ["restore_stamina"] = 0, ["use_time_s"] = 0.0,
            ["cures"] = new JsonArray(), ["extra_effects"] = new JsonObject()
        };
    }

    private static JsonObject Skill(string code, string name, JsonNode balance, string thresholds, params string[] effects)
    {
        var curve = balance[thresholds]!.AsArray();
        var effectObject = new JsonObject();
        foreach (var effect in effects)
            effectObject[Snake(effect)] = balance[effect]!.DeepClone();
        return new JsonObject
        {
            ["code"] = code, ["name"] = name, ["skill_type"] = code, ["max_level"] = curve.Count,
            ["xp_curve"] = curve.DeepClone(), ["effects"] = effectObject
        };
    }

    private static JsonObject LootEntry(string table, string item, int tier, double weight, int min, int max) => new()
    {
        ["loot_table_code"] = table, ["item_code"] = item, ["tier"] = tier, ["weight"] = Round(weight, 4), ["min_qty"] = min, ["max_qty"] = max
    };

    private static JsonObject Enemy(string code, string name, string archetype, bool isBoss, int maxHp, JsonNode perception,
        double accuracy, JsonNode accuracyProfile, string? weapon, string? lootTable, JsonObject? extra)
    {
        var fsm = new JsonObject
        {
            ["alert_decay_seconds"] = Num(perception, "alert_decay_seconds"),
            ["retreat_hp_threshold"] = Num(perception, "retreat_hp_threshold"),
            ["accuracy"] = accuracyProfile.DeepClone()
        };
        if (isBoss && perception["boss"] is { } boss)
            fsm["boss"] = boss.DeepClone();
        foreach (var (key, value) in extra ?? [])
            fsm[key] = value?.DeepClone();

        return new JsonObject
        {
            ["code"] = code,
            ["name"] = name,
            ["archetype"] = archetype,
            ["is_boss"] = isBoss,
            ["max_hp"] = maxHp,
            ["move_speed"] = Round(Num(perception, "move_speed")!.Value, 2),
            ["vision_range"] = Round(Num(perception, "vision_range")!.Value, 2),
            ["vision_angle_deg"] = Round(Num(perception, "vision_angle")!.Value, 2),
            ["hearing_range"] = Round(Num(perception, "hearing_range")!.Value, 2),
            ["accuracy"] = Round(accuracy, 3),
            ["weapon_item_code"] = weapon,
            ["fsm_params"] = fsm,
            ["loot_table_code"] = lootTable
        };
    }

    // StageIds array in Map01Quest.cs: the index of each id is the stage number the game sends as payload.index
    private static List<string> StageIds(string assets)
    {
        var source = File.ReadAllText(Path.Combine(assets, "_Project/Map01/Runtime/Map01Quest.cs"));
        var match = Regex.Match(source, @"StageIds\s*=\s*\{(?<ids>[^}]*)\}");
        if (!match.Success)
            throw new IOException("Map01Quest.StageIds not found.");
        return Regex.Matches(match.Groups["ids"].Value, "\"([a-z0-9_]+)\"").Select(m => m.Groups[1].Value).ToList();
    }

    private static JsonNode Read(string assets, string relative) =>
        JsonNode.Parse(File.ReadAllText(Path.Combine(assets, relative)))
        ?? throw new IOException($"{relative} is empty.");

    private static IEnumerable<JsonNode> Rows(JsonNode node, string key) => node[key]!.AsArray().Select(r => r!);
    private static string Str(JsonNode node, string key) => node[key]!.GetValue<string>();
    private static string? StrOrNull(JsonNode node, string key) => node[key]?.GetValue<string>();
    private static int Int(JsonNode node, string key) => (int)Math.Round(node[key]!.GetValue<double>());
    private static double? Num(JsonNode node, string key) => node[key]?.GetValue<double>();
    private static double Round(double value, int digits) => Math.Round(value, digits, MidpointRounding.AwayFromZero);

    // "QuestItem" -> "quest_item", "baseValue" -> "base_value"
    private static string Snake(string name) => Regex.Replace(name, "(?<=[a-z0-9])([A-Z])", "_$1").ToLowerInvariant();

    private static string Title(string code) =>
        CultureInfo.InvariantCulture.TextInfo.ToTitleCase(code.Replace('_', ' '));
}
