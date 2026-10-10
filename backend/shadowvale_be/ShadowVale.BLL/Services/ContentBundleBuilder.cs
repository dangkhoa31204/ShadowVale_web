using System.Text.Json;
using System.Text.Json.Nodes;
using ShadowVale.DAL.Entities;

namespace ShadowVale.BLL.Services;

public static class ContentBundleBuilder
{
    public static IEnumerable<BaseEntity> ContentRows(ContentVersion version) =>
        version.Items.Cast<BaseEntity>()
            .Concat(version.Items.Where(i => i.Weapon != null).Select(i => i.Weapon!))
            .Concat(version.Items.Where(i => i.Consumable != null).Select(i => i.Consumable!))
            .Concat(version.Skills).Concat(version.LootTables)
            .Concat(version.LootTables.SelectMany(t => t.Entries))
            .Concat(version.EnemyTypes).Concat(version.Maps)
            .Concat(version.Maps.SelectMany(m => m.EnemyPlacements))
            .Concat(version.Maps.SelectMany(m => m.LootTables))
            .Concat(version.CraftingRecipes).Concat(version.CraftingRecipes.SelectMany(r => r.Ingredients))
            .Concat(version.Quests).Concat(version.Quests.SelectMany(q => q.Rewards));

    public static JsonObject Build(ContentVersion v)
    {
        var items = v.Items.ToDictionary(i => i.Id, i => i.Code);
        var skills = v.Skills.ToDictionary(i => i.Id, i => i.Code);
        var loot = v.LootTables.ToDictionary(i => i.Id, i => i.Code);
        var maps = v.Maps.ToDictionary(i => i.Id, i => i.Code);
        var enemies = v.EnemyTypes.ToDictionary(i => i.Id, i => i.Code);
        var recipes = v.CraftingRecipes.ToDictionary(i => i.Id, i => i.Code);
        var quests = v.Quests.ToDictionary(i => i.Id, i => i.Code);
        var weapons = v.Items.Where(i => i.Weapon != null).ToDictionary(i => i.Weapon!.Id, i => i.Code);
        return Row(("version_no", v.VersionNo), ("label", v.Label), ("schema_version", v.SchemaVersion),
            ("changelog", v.Changelog), ("content_version_id", v.Id),
            ("items", Rows(v.Items.OrderBy(i => i.Code, StringComparer.Ordinal), i => Row(
                ("code", i.Code), ("name", i.Name), ("description", i.Description), ("item_type", Text(i.Type)),
                ("rarity", Text(i.Rarity)), ("max_stack", i.MaxStack), ("weight", i.Weight),
                ("base_value", i.BaseValue), ("stats", Json(i.Stats)), ("icon_key", i.IconKey)))),
            ("weapons", Rows(v.Items.Where(i => i.Weapon != null).OrderBy(i => i.Code, StringComparer.Ordinal), i =>
            {
                var w = i.Weapon!;
                return Row(("item_code", i.Code), ("item_type", "weapon"), ("weapon_class", Text(w.Class)),
                    ("damage", w.Damage), ("fire_rate", w.FireRate), ("effective_range", w.EffectiveRange),
                    ("magazine_size", w.MagazineSize), ("reload_time_s", w.ReloadTimeSeconds),
                    ("ammo_item_code", Code(items, w.AmmoItemId)), ("ammo_type", "ammo"),
                    ("max_durability", w.MaxDurability), ("durability_per_use", w.DurabilityPerUse),
                    ("noise_radius", w.NoiseRadius), ("is_suppressed", w.IsSuppressed));
            })),
            ("consumables", Rows(v.Items.Where(i => i.Consumable != null).OrderBy(i => i.Code, StringComparer.Ordinal), i =>
            {
                var c = i.Consumable!;
                return Row(("item_code", i.Code), ("item_type", "consumable"), ("heal_hp", c.HealHp),
                    ("restore_stamina", c.RestoreStamina), ("use_time_s", c.UseTimeSeconds),
                    ("cures", c.Cures), ("extra_effects", Json(c.ExtraEffects)));
            })),
            ("skills", Rows(v.Skills.OrderBy(i => i.Code, StringComparer.Ordinal), i => Row(("code", i.Code),
                ("name", i.Name), ("skill_type", Text(i.Type)), ("max_level", i.MaxLevel),
                ("xp_curve", Json(i.XpCurve)), ("effects", Json(i.Effects))))),
            ("loot_tables", Rows(v.LootTables.OrderBy(i => i.Code, StringComparer.Ordinal), i => Row(
                ("code", i.Code), ("name", i.Name), ("rolls_min", i.RollsMin), ("rolls_max", i.RollsMax)))),
            ("loot_table_entries", Rows(v.LootTables.SelectMany(i => i.Entries).OrderBy(i => i.Id), i => Row(
                ("loot_table_code", Code(loot, i.LootTableId)), ("item_code", Code(items, i.ItemId)),
                ("tier", i.Tier), ("weight", i.Weight), ("min_qty", i.MinQuantity), ("max_qty", i.MaxQuantity)))),
            ("maps", Rows(v.Maps.OrderBy(i => i.Code, StringComparer.Ordinal), i => Row(("code", i.Code),
                ("name", i.Name), ("scene_key", i.SceneKey), ("is_safe_camp", i.IsSafeCamp),
                ("sort_order", i.SortOrder), ("nav_graph", Json(i.NavGraph)), ("layout", Json(i.Layout))))),
            ("map_loot_tables", Rows(v.Maps.SelectMany(i => i.LootTables).OrderBy(i => i.Id), i => Row(
                ("map_code", Code(maps, i.MapId)), ("loot_table_code", Code(loot, i.LootTableId)),
                ("container_tag", i.ContainerTag)))),
            ("enemy_types", Rows(v.EnemyTypes.OrderBy(i => i.Code, StringComparer.Ordinal), i => Row(
                ("code", i.Code), ("name", i.Name), ("archetype", i.Archetype), ("is_boss", i.IsBoss),
                ("max_hp", i.MaxHp), ("move_speed", i.MoveSpeed), ("vision_range", i.VisionRange),
                ("vision_angle_deg", i.VisionAngleDegrees), ("hearing_range", i.HearingRange),
                ("accuracy", i.Accuracy), ("weapon_item_code", Code(weapons, i.WeaponId)),
                ("fsm_params", Json(i.FsmParams)), ("loot_table_code", Code(loot, i.LootTableId))))),
            ("enemy_placements", Rows(v.Maps.SelectMany(i => i.EnemyPlacements).OrderBy(i => i.Id), i => Row(
                ("id", i.Id), ("map_code", Code(maps, i.MapId)), ("enemy_type_code", Code(enemies, i.EnemyTypeId)),
                ("squad_tag", i.SquadTag), ("pos_x", i.PosX), ("pos_y", i.PosY), ("facing_deg", i.FacingDegrees),
                ("patrol_route", Json(i.PatrolRoute)), ("spawn_condition", Json(i.SpawnCondition))))),
            ("crafting_recipes", Rows(v.CraftingRecipes.OrderBy(i => i.Code, StringComparer.Ordinal), i => Row(
                ("code", i.Code), ("name", i.Name), ("output_item_code", Code(items, i.OutputItemId)),
                ("output_quantity", i.OutputQuantity), ("craft_time_s", i.CraftTimeSeconds),
                ("required_skill_code", Code(skills, i.RequiredSkillId)), ("required_skill_level", i.RequiredSkillLevel),
                ("station", i.Station)))),
            ("crafting_recipe_ingredients", Rows(v.CraftingRecipes.SelectMany(i => i.Ingredients).OrderBy(i => i.Id), i => Row(
                ("recipe_code", Code(recipes, i.RecipeId)), ("item_code", Code(items, i.ItemId)), ("quantity", i.Quantity)))),
            ("quests", Rows(v.Quests.OrderBy(i => i.Code, StringComparer.Ordinal), i => Row(("code", i.Code),
                ("title", i.Title), ("description", i.Description), ("is_main", i.IsMain), ("sort_order", i.SortOrder),
                ("objectives", Json(i.Objectives)), ("prerequisites", i.Prerequisites), ("reward_xp", i.RewardXp)))),
            ("quest_rewards", Rows(v.Quests.SelectMany(i => i.Rewards).OrderBy(i => i.Id), i => Row(
                ("quest_code", Code(quests, i.QuestId)), ("item_code", Code(items, i.ItemId)), ("quantity", i.Quantity)))));
    }

    private static string Text<T>(T value) where T : Enum => JsonNamingPolicy.SnakeCaseLower.ConvertName(value.ToString());
    // A cross-version FK becomes an unresolved code and is rejected by validation.
    private static string? Code(Dictionary<Guid, string> lookup, Guid? id) => id == null ? null :
        lookup.GetValueOrDefault(id.Value) ?? $"unknown_reference_{id.Value:N}";
    private static JsonNode? Json(string? value)
    {
        if (value == null) return null;
        try { return JsonNode.Parse(value); }
        catch (JsonException) { return JsonValue.Create(value); }
    }
    private static JsonArray Rows<T>(IEnumerable<T> values, Func<T, JsonObject> build) =>
        new(values.Select(v => (JsonNode)build(v)).ToArray());
    private static JsonObject Row(params (string Key, object? Value)[] fields)
    {
        var row = new JsonObject();
        foreach (var (key, value) in fields)
            row[key] = value is JsonNode node ? node : JsonSerializer.SerializeToNode(value);
        return row;
    }
}
