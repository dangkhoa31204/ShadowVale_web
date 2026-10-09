using System.Text.Json;
using System.Text.Json.Nodes;
using ShadowVale.BLL.DTOs.Content;

namespace ShadowVale.BLL.Services;

public static class ContentBundleComparison
{
    // Content identities survive cloning even though database row IDs change.
    private static readonly Dictionary<string, string[]> Identities = new()
    {
        ["weapons"] = ["item_code"], ["consumables"] = ["item_code"],
        ["loot_table_entries"] = ["loot_table_code", "item_code", "tier"],
        ["map_loot_tables"] = ["map_code", "loot_table_code", "container_tag"],
        ["crafting_recipe_ingredients"] = ["recipe_code", "item_code"],
        ["quest_rewards"] = ["quest_code", "item_code"]
    };

    public static IReadOnlyList<ContentDifferenceDto> Compare(JsonObject source, JsonObject target)
    {
        var changes = new List<ContentDifferenceDto>();
        foreach (var key in source.Select(p => p.Key).Union(target.Select(p => p.Key)).Order(StringComparer.Ordinal))
        {
            if (key is "content_version_id" or "version_no") continue;
            if (source[key] is JsonArray before && target[key] is JsonArray after)
            {
                if (key == "enemy_placements")
                {
                    // Placements have no stable code. Compare their content as a multiset,
                    // preserving duplicates but ignoring regenerated clone IDs.
                    Diff(NormalizePlacements(before), NormalizePlacements(after), "/enemy_placements", changes);
                    continue;
                }
                var fields = Identities.GetValueOrDefault(key) ?? ["code"];
                string Identity(JsonNode? row) => JsonSerializer.Serialize(fields.Select(f => row?[f]?.ToString()));
                var a = before.ToDictionary(Identity);
                var b = after.ToDictionary(Identity);
                foreach (var identity in a.Keys.Union(b.Keys).Order(StringComparer.Ordinal))
                    Diff(a.GetValueOrDefault(identity), b.GetValueOrDefault(identity),
                        $"/{Escape(key)}/{Escape(identity)}", changes);
            }
            else Diff(source[key], target[key], "/" + Escape(key), changes);
        }
        return changes;
    }

    private static JsonArray NormalizePlacements(JsonArray rows)
    {
        var normalized = rows.Select(row =>
        {
            var copy = row!.DeepClone().AsObject();
            foreach (var key in new[] { "id", "content_version_id", "created_at", "updated_at" }) copy.Remove(key);
            return copy;
        }).OrderBy(ContentVersionService.CanonicalJson, StringComparer.Ordinal);
        return new JsonArray(normalized.Select(row => (JsonNode)row).ToArray());
    }

    private static void Diff(JsonNode? before, JsonNode? after, string path, List<ContentDifferenceDto> changes)
    {
        if (JsonNode.DeepEquals(before, after)) return;
        if (before is JsonObject a && after is JsonObject b)
        {
            foreach (var key in a.Select(p => p.Key).Union(b.Select(p => p.Key)).Order(StringComparer.Ordinal))
            {
                if (key is "content_version_id" or "created_at" or "updated_at") continue;
                Diff(a[key], b[key], path + "/" + Escape(key), changes);
            }
        }
        else changes.Add(new(path, before == null ? null : JsonSerializer.SerializeToElement(before),
            after == null ? null : JsonSerializer.SerializeToElement(after)));
    }

    private static string Escape(string value) => value.Replace("~", "~0").Replace("/", "~1");
}
