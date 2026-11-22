using System.Text.Json.Nodes;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services;

// A source snapshot is deliberately separate from authored versions: viewing it never publishes or overwrites a draft.
public class GameCatalogService(IGameContentRepository content)
{
    private static readonly string Snapshot = ReadSnapshot();
    private static readonly Dictionary<string, string[]> Keys = new()
    {
        ["items"] = ["code"], ["weapons"] = ["item_code"], ["loot_tables"] = ["code"],
        ["loot_table_entries"] = ["loot_table_code", "item_code", "tier"],
        ["crafting_recipes"] = ["code"], ["crafting_recipe_ingredients"] = ["recipe_code", "item_code"],
        ["maps"] = ["code"], ["map_loot_tables"] = ["map_code", "container_tag"]
    };

    public static JsonObject GetSnapshot() => JsonNode.Parse(Snapshot)!.AsObject();

    public async Task<JsonObject> ComparePublishedAsync(CancellationToken ct = default)
    {
        var manifest = await content.GetPublishedManifestAsync(ct);
        if (manifest is null) return new JsonObject { ["status"] = "nothing_published", ["differences"] = new JsonArray() };
        // Use the selected version ID to avoid mixing two versions if publication happens during this request.
        var published = await content.GetEverPublishedBundleAsync(manifest.Id, ct);
        if (published is null) return new JsonObject { ["status"] = "bundle_unavailable", ["differences"] = new JsonArray() };
        var projection = GetSnapshot()["authoringProjection"]!.AsObject();
        var differences = Compare(projection, JsonNode.Parse(published.Bundle)!.AsObject());
        return new JsonObject
        {
            ["status"] = differences.Count == 0 ? "covered_fields_match" : "different",
            ["versionId"] = manifest.Id.ToString(), ["versionNo"] = manifest.VersionNo, ["label"] = manifest.Label,
            ["checksum"] = published.Checksum, ["differences"] = differences,
            ["scope"] = "Local defaults versus published bundle, for exported fields only. Matching does not verify a running player's effective configuration. Trade, field crafting, adaptive rules and mission flow are local-only."
        };
    }

    public static JsonArray Compare(JsonObject projection, JsonObject published)
    {
        var differences = new JsonArray();
        foreach (var (collection, keys) in Keys)
        {
            var localRows = (projection[collection] as JsonArray ?? []).OfType<JsonObject>().ToList();
            var remoteRows = (published[collection] as JsonArray ?? []).OfType<JsonObject>().ToList();
            string Key(JsonObject row) => string.Join("/", keys.Select(k => row[k]?.ToJsonString() ?? "null"));
            foreach (var local in localRows)
            {
                var remote = remoteRows.FirstOrDefault(r => keys.All(k => Equal(local[k], r[k])));
                if (remote is null) { Add("missing_in_published", Key(local), null, local, null); continue; }
                foreach (var (field, value) in local.Where(f => !keys.Contains(f.Key)))
                    if (!Equal(value, remote[field])) Add("changed", Key(local), field, value, remote[field]);
            }
            // Projection covers a subset of loot tables/items; extras may be valid authoring content.
            foreach (var remote in remoteRows.Where(r => !localRows.Any(l => keys.All(k => Equal(l[k], r[k])))))
                Add("published_only", Key(remote), null, null, remote);

            void Add(string kind, string key, string? field, JsonNode? local, JsonNode? remote) => differences.Add(new JsonObject
            {
                ["collection"] = collection, ["key"] = key, ["kind"] = kind, ["field"] = field,
                ["unity"] = local?.DeepClone(), ["published"] = remote?.DeepClone()
            });
        }
        return differences;
    }

    private static bool Equal(JsonNode? a, JsonNode? b)
    {
        if (a is JsonValue av && b is JsonValue bv &&
            decimal.TryParse(av.ToJsonString(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var an) &&
            decimal.TryParse(bv.ToJsonString(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var bn))
            return an == bn;
        return JsonNode.DeepEquals(a, b);
    }

    private static string ReadSnapshot()
    {
        using var stream = typeof(GameCatalogService).Assembly.GetManifestResourceStream("ShadowVale.BLL.Catalog.unity-catalog.json")
            ?? throw new InvalidOperationException("Unity catalog resource is missing. Run tools/sync-unity-catalog.mjs before building.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
