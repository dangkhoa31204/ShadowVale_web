using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Schema;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.Interfaces;

namespace ShadowVale.BLL.Services;

public sealed class ContentBundleValidator : IContentBundleValidator
{
    private readonly JsonSchema _schema;

    public ContentBundleValidator()
    {
        using var stream = typeof(ContentBundleValidator).Assembly.GetManifestResourceStream(
            "ShadowVale.BLL.Schemas.content-bundle-1.0.schema.json")!;
        using var document = JsonDocument.Parse(stream);
        // JsonSchema retains elements from its input beyond this document's lifetime.
        _schema = JsonSchema.Build(document.RootElement.Clone());
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
        return errors.Distinct().ToArray();
    }

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
