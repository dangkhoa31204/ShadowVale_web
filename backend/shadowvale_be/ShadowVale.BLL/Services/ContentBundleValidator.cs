using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Schema;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.Interfaces;

namespace ShadowVale.BLL.Services;

public sealed class ContentBundleValidator : IContentBundleValidator
{
    private readonly JsonSchema _schema;
    private readonly JsonSchema _rulesSchema;
    private readonly JsonSchema _lootStatsSchema;

    public ContentBundleValidator()
    {
        using var stream = typeof(ContentBundleValidator).Assembly.GetManifestResourceStream(
            "ShadowVale.BLL.Schemas.content-bundle-1.0.schema.json")!;
        using var document = JsonDocument.Parse(stream);
        // JsonSchema retains elements from its input beyond this document's lifetime.
        _schema = JsonSchema.Build(document.RootElement.Clone());
        using var rulesStream = typeof(ContentBundleValidator).Assembly.GetManifestResourceStream("ShadowVale.BLL.Schemas.game-rules.schema.json")!;
        using var rulesDocument = JsonDocument.Parse(rulesStream);
        _rulesSchema = JsonSchema.Build(rulesDocument.RootElement.Clone());
        using var statsStream = typeof(ContentBundleValidator).Assembly.GetManifestResourceStream("ShadowVale.BLL.Schemas.loot-item-stats.schema.json")!;
        using var statsDocument = JsonDocument.Parse(statsStream);
        _lootStatsSchema = JsonSchema.Build(statsDocument.RootElement.Clone());
    }

    private static readonly Dictionary<string, string[]> Identities = new()
    {
        ["items"] = ["code"], ["skills"] = ["code"], ["loot_tables"] = ["code"],
        ["maps"] = ["code"], ["enemy_types"] = ["code"], ["crafting_recipes"] = ["code"],
        ["quests"] = ["code"], ["weapons"] = ["item_code"], ["consumables"] = ["item_code"],
        ["loot_table_entries"] = ["loot_table_code", "item_code", "tier"],
        ["map_loot_tables"] = ["map_code", "loot_table_code", "container_tag"],
        ["crafting_recipe_ingredients"] = ["recipe_code", "item_code"],
        ["quest_rewards"] = ["quest_code", "item_code"], ["enemy_placements"] = ["id"]
    };

    private static readonly (string Collection, string Field, string Target, string TargetField, string? ItemType)[] References =
    [
        ("weapons", "item_code", "items", "code", "weapon"),
        ("weapons", "ammo_item_code", "items", "code", "ammo"),
        ("consumables", "item_code", "items", "code", "consumable"),
        ("loot_table_entries", "loot_table_code", "loot_tables", "code", null),
        ("loot_table_entries", "item_code", "items", "code", null),
        ("map_loot_tables", "map_code", "maps", "code", null),
        ("map_loot_tables", "loot_table_code", "loot_tables", "code", null),
        ("enemy_types", "weapon_item_code", "weapons", "item_code", null),
        ("enemy_types", "loot_table_code", "loot_tables", "code", null),
        ("enemy_placements", "map_code", "maps", "code", null),
        ("enemy_placements", "enemy_type_code", "enemy_types", "code", null),
        ("crafting_recipes", "output_item_code", "items", "code", null),
        ("crafting_recipes", "required_skill_code", "skills", "code", null),
        ("crafting_recipe_ingredients", "recipe_code", "crafting_recipes", "code", null),
        ("crafting_recipe_ingredients", "item_code", "items", "code", null),
        ("quest_rewards", "quest_code", "quests", "code", null),
        ("quest_rewards", "item_code", "items", "code", null),
        ("quests", "prerequisites", "quests", "code", null)
    ];

    public IReadOnlyList<ContentValidationIssue> Validate(JsonObject bundle)
    {
        var errors = new List<ContentValidationIssue>();
        var evaluation = _schema.Evaluate(JsonSerializer.SerializeToElement(bundle),
            new EvaluationOptions { OutputFormat = OutputFormat.List });
        CollectErrors(evaluation, errors);
        if (!evaluation.IsValid) return errors.Distinct().ToArray();

        foreach (var (collection, fields) in Identities)
        {
            var seen = new HashSet<string>(StringComparer.Ordinal);
            var rows = bundle[collection]!.AsArray();
            for (var i = 0; i < rows.Count; i++)
            {
                var row = rows[i]!;
                // Placement IDs are optional in the editor contract.
                if (fields.All(f => row[f] != null))
                {
                    var identity = JsonSerializer.Serialize(fields.Select(f => row[f]!.ToJsonString()));
                    if (!seen.Add(identity)) errors.Add(new($"/{collection}/{i}", "Duplicate content identity."));
                }
                if (row["content_version_id"] != null &&
                    row["content_version_id"]!.ToString() != bundle["content_version_id"]?.ToString())
                    errors.Add(new($"/{collection}/{i}/content_version_id", "Record belongs to another content version."));
            }
        }

        foreach (var reference in References)
        {
            var targets = bundle[reference.Target]!.AsArray().Select(r => r!.AsObject()).ToList();
            var rows = bundle[reference.Collection]!.AsArray();
            for (var i = 0; i < rows.Count; i++)
            {
                var value = rows[i]![reference.Field];
                if (value == null) continue;
                var values = value is JsonArray array ? array : new JsonArray(value.DeepClone());
                foreach (var code in values)
                {
                    var target = targets.FirstOrDefault(t => t[reference.TargetField]!.ToString() == code!.ToString());
                    if (target == null)
                        errors.Add(new($"/{reference.Collection}/{i}/{reference.Field}", $"Unknown reference: {code}."));
                    else if (reference.ItemType != null && target["item_type"]!.ToString() != reference.ItemType)
                        errors.Add(new($"/{reference.Collection}/{i}/{reference.Field}", $"Must reference an item of type {reference.ItemType}."));
                }
            }
        }

        if (bundle["maps"]!.AsArray().Count(m => m!["is_safe_camp"]!.GetValue<bool>()) != 1)
            errors.Add(new("/maps", "Exactly one map must be the Safe Camp."));
        CheckRange(bundle, "loot_tables", "rolls_min", "rolls_max", errors);
        CheckRange(bundle, "loot_table_entries", "min_qty", "max_qty", errors);

        var items = bundle["items"]!.AsArray();
        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i]!;
            var type = item["item_type"]!.ToString();
            if (type == "weapon" && item["max_stack"]!.GetValue<int>() != 1)
                errors.Add(new($"/items/{i}/max_stack", "Weapons cannot be stacked."));
            var child = type == "weapon" ? "weapons" : type == "consumable" ? "consumables" : null;
            if (child != null && bundle[child]!.AsArray().Count(c => c!["item_code"]!.ToString() == item["code"]!.ToString()) != 1)
                errors.Add(new($"/items/{i}", $"Item must have exactly one {child} record."));
        }
        var weapons = bundle["weapons"]!.AsArray();
        for (var i = 0; i < weapons.Count; i++)
            if (weapons[i]!["weapon_class"]!.ToString() == "melee" &&
                (weapons[i]!["ammo_item_code"] != null || weapons[i]!["magazine_size"] != null))
                errors.Add(new($"/weapons/{i}", "Melee weapons cannot have ammo or a magazine."));

        var recipes = bundle["crafting_recipes"]!.AsArray();
        for (var i = 0; i < recipes.Count; i++)
        {
            var recipe = recipes[i]!;
            var skill = bundle["skills"]!.AsArray().FirstOrDefault(s => s!["code"]!.ToString() == recipe["required_skill_code"]?.ToString());
            var level = recipe["required_skill_level"]!.GetValue<int>();
            if ((skill == null && recipe["required_skill_code"] == null && level > 0) ||
                (skill != null && level > skill["max_level"]!.GetValue<int>()))
                errors.Add(new($"/crafting_recipes/{i}/required_skill_level", "Required level must fit the selected skill."));
        }
        CheckQuestCycles(bundle, errors);
        CheckGameRules(bundle, errors);
        return errors.Distinct().ToArray();
    }

    private void CheckGameRules(JsonObject bundle, List<ContentValidationIssue> errors)
    {
        var itemRows = bundle["items"]!.AsArray();
        var weapons = bundle["weapons"]!.AsArray().Select(w => w!["item_code"]!.ToString()).ToHashSet();
        var ammo = itemRows.Where(i => i!["item_type"]!.ToString() == "ammo").Select(i => i!["code"]!.ToString()).ToHashSet();
        var items = itemRows.Select(i => i!["code"]!.ToString()).ToHashSet();
        for (var i = 0; i < itemRows.Count; i++)
        {
            var stats = itemRows[i]!["stats"]!;
            var prefix = $"/items/{i}/stats";
            var check = _lootStatsSchema.Evaluate(JsonSerializer.SerializeToElement(stats), new EvaluationOptions { OutputFormat = OutputFormat.List });
            var issues = new List<ContentValidationIssue>(); CollectErrors(check, issues);
            errors.AddRange(issues.Select(e => new ContentValidationIssue(prefix + e.Path, e.Message)));
            if (!check.IsValid) continue;
            if (stats["found_min"] is { } min && stats["found_max"] is { } max && Number(min) > Number(max))
                errors.Add(new(prefix, "Found condition minimum must not exceed maximum."));
            if (stats["salvage_good_item"] is { } good && !items.Contains(good.ToString()))
                errors.Add(new(prefix + "/salvage_good_item", "Unknown salvage bonus item."));
            foreach (var yield in stats["salvage"] as JsonArray ?? [])
                if (!items.Contains(yield!["item"]!.ToString()) || Number(yield["min"]!) > Number(yield["max"]!))
                    errors.Add(new(prefix + "/salvage", "Salvage needs existing items and an ordered quantity range."));
        }
        var recipes = bundle["crafting_recipes"]!.AsArray().Select(r => r!["code"]!.ToString()).ToHashSet();
        var objectiveIds = bundle["quests"]!.AsArray().SelectMany(q => (q!["objectives"] as JsonArray ?? []).OfType<JsonObject>()).Select(o => o["id"]?.ToString()).ToHashSet();
        var maps = bundle["maps"]!.AsArray();
        for (var index = 0; index < maps.Count; index++)
        {
            var rules = maps[index]?["layout"]?["game_rules"];
            if (rules is null) continue;
            var prefix = $"/maps/{index}/layout/game_rules";
            var evaluation = _rulesSchema.Evaluate(JsonSerializer.SerializeToElement(rules), new EvaluationOptions { OutputFormat = OutputFormat.List });
            var issues = new List<ContentValidationIssue>();
            CollectErrors(evaluation, issues);
            errors.AddRange(issues.Select(e => new ContentValidationIssue(prefix + e.Path, e.Message)));
            if (!evaluation.IsValid) continue;
            if (rules["difficulty"]?["levels"] is JsonObject levels)
            {
                var mapCode = maps[index]?["code"]?.GetValue<string>() ?? "";
                var presets = GameCatalogService.LayoutPresetsFor(mapCode);
                foreach (var (level, profile) in levels)
                {
                    var preset = profile!["layout_preset_id"]!.GetValue<string>();
                    if (!presets.Contains(preset))
                        errors.Add(new(prefix + "/difficulty/levels/" + level + "/layout_preset_id",
                            "Choose a layout preset available for this map."));
                }
            }
            var seen = new HashSet<string>();
            foreach (var offer in rules["trade_offers"] as JsonArray ?? [])
            {
                if (!weapons.Contains(offer!["gun"]!.ToString()) || !ammo.Contains(offer["ammo"]!.ToString()))
                    errors.Add(new(prefix + "/trade_offers", "Trade stock must reference a weapon and ammunition in the same version."));
                if (!seen.Add(offer["gun"]!.ToString())) errors.Add(new(prefix + "/trade_offers", "Each weapon may appear once in stock."));
            }
            if (rules["tier_odds"] is JsonArray odds && odds.Sum(o => Number(o!)) <= 0)
                errors.Add(new(prefix + "/tier_odds", "Tier odds must have a positive sum."));
            if (rules["logistics"] is JsonObject logistics)
            {
                if (logistics["turnInFloor"] is { } floor && logistics["turnInCeiling"] is { } ceiling && Number(floor) > Number(ceiling))
                    errors.Add(new(prefix + "/logistics", "Turn-in floor must not exceed ceiling."));
                foreach (var field in new[] { "materialTrade", "mapTwoRewards" })
                {
                    var ids = new HashSet<string>();
                    foreach (var entry in logistics[field] as JsonArray ?? [])
                    {
                        var code = entry!["id"]!.ToString();
                        if (!ids.Add(code) || (field == "materialTrade" ? !items.Contains(code) : !objectiveIds.Contains(code)))
                            errors.Add(new(prefix + "/logistics/" + field, "Credit entries need unique, existing item/objective IDs."));
                    }
                }
            }
            foreach (var recipe in rules["field_crafting"] as JsonObject ?? [])
                if (!recipes.Contains(recipe.Key)) errors.Add(new(prefix + "/field_crafting", "Unknown recipe: " + recipe.Key));
        }
    }

    private static double Number(JsonNode node) => double.Parse(node.ToString(), System.Globalization.CultureInfo.InvariantCulture);

    private static void CollectErrors(EvaluationResults result, List<ContentValidationIssue> errors)
    {
        if (result.Errors != null)
            foreach (var error in result.Errors.Values)
                errors.Add(new(result.InstanceLocation.ToString() is { Length: > 0 } path ? path : "/", error));
        if (result.Details != null)
            foreach (var detail in result.Details) CollectErrors(detail, errors);
    }

    private static void CheckRange(JsonObject bundle, string collection, string min, string max,
        List<ContentValidationIssue> errors)
    {
        var rows = bundle[collection]!.AsArray();
        for (var i = 0; i < rows.Count; i++)
            if (rows[i]![min]!.GetValue<int>() > rows[i]![max]!.GetValue<int>())
                errors.Add(new($"/{collection}/{i}", $"{min} must be less than or equal to {max}."));
    }

    private static void CheckQuestCycles(JsonObject bundle, List<ContentValidationIssue> errors)
    {
        var dependencies = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
        foreach (var quest in bundle["quests"]!.AsArray())
            dependencies.TryAdd(quest!["code"]!.ToString(), quest["prerequisites"]!.AsArray()
                .Select(p => p!.ToString()).ToHashSet(StringComparer.Ordinal));
        var queue = new Queue<string>(dependencies.Where(p => p.Value.Count == 0).Select(p => p.Key));
        var count = 0;
        while (queue.TryDequeue(out var code))
        {
            count++;
            foreach (var entry in dependencies)
                if (entry.Value.Remove(code) && entry.Value.Count == 0) queue.Enqueue(entry.Key);
        }
        if (count != dependencies.Count)
            errors.Add(new("/quests", "Quest prerequisites contain a cycle or an unresolved dependency."));
    }
}
