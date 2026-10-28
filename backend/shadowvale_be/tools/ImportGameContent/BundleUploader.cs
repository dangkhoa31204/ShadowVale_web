using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

// Creates a Draft from a schema 1.0 bundle through the same authoring endpoints the web app uses
// (README "Nội dung của một version"), then validates it. Rows are sent in dependency order:
// items without references first, weapons after their ammo, then skills, loot tables, enemies, maps, recipes, quests.
public static class BundleUploader
{
    public static async Task<bool> PushAsync(JsonObject bundle, string api, string token)
    {
        using var http = new HttpClient { BaseAddress = new Uri(api.TrimEnd('/') + "/"), Timeout = TimeSpan.FromSeconds(100) };
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var version = await SendAsync(http, "api/content-versions", new JsonObject
        {
            ["label"] = bundle["label"]?.DeepClone(),
            ["changelog"] = bundle["changelog"]?.DeepClone(),
            ["schemaVersion"] = "1.0"
        });
        var id = version["id"]!.GetValue<string>();
        var root = $"api/content-versions/{id}";
        Console.WriteLine($"Created Draft {id}");

        var weapons = ByCode(bundle, "weapons", "item_code");
        var consumables = ByCode(bundle, "consumables", "item_code");
        var items = Rows(bundle, "items").OrderBy(i => i["item_type"]!.GetValue<string>() == "weapon" ? 1 : 0);
        foreach (var item in items)
        {
            var code = item["code"]!.GetValue<string>();
            await SendAsync(http, $"{root}/items", new JsonObject
            {
                ["code"] = code,
                ["name"] = item["name"]?.DeepClone(),
                ["description"] = item["description"]?.DeepClone(),
                ["type"] = Pascal(item["item_type"]!.GetValue<string>()),
                ["rarity"] = Pascal(item["rarity"]!.GetValue<string>()),
                ["maxStack"] = item["max_stack"]?.DeepClone(),
                ["weight"] = item["weight"]?.DeepClone(),
                ["baseValue"] = item["base_value"]?.DeepClone(),
                ["stats"] = item["stats"]?.DeepClone(),
                ["iconKey"] = item["icon_key"]?.DeepClone(),
                ["weapon"] = weapons.TryGetValue(code, out var w) ? new JsonObject
                {
                    ["class"] = Pascal(w["weapon_class"]!.GetValue<string>()),
                    ["damage"] = w["damage"]?.DeepClone(),
                    ["fireRate"] = w["fire_rate"]?.DeepClone(),
                    ["effectiveRange"] = w["effective_range"]?.DeepClone(),
                    ["magazineSize"] = w["magazine_size"]?.DeepClone(),
                    ["reloadTimeSeconds"] = w["reload_time_s"]?.DeepClone(),
                    ["ammoItemCode"] = w["ammo_item_code"]?.DeepClone(),
                    ["maxDurability"] = w["max_durability"]?.DeepClone(),
                    ["durabilityPerUse"] = w["durability_per_use"]?.DeepClone(),
                    ["noiseRadius"] = w["noise_radius"]?.DeepClone(),
                    ["isSuppressed"] = w["is_suppressed"]?.DeepClone()
                } : null,
                ["consumable"] = consumables.TryGetValue(code, out var c) ? new JsonObject
                {
                    ["healHp"] = c["heal_hp"]?.DeepClone(),
                    ["restoreStamina"] = c["restore_stamina"]?.DeepClone(),
                    ["useTimeSeconds"] = c["use_time_s"]?.DeepClone(),
                    ["cures"] = c["cures"]?.DeepClone(),
                    ["extraEffects"] = c["extra_effects"]?.DeepClone()
                } : null
            });
        }
        Console.WriteLine($"  {items.Count()} items");

        foreach (var skill in Rows(bundle, "skills"))
            await SendAsync(http, $"{root}/skills", new JsonObject
            {
                ["code"] = skill["code"]?.DeepClone(),
                ["name"] = skill["name"]?.DeepClone(),
                ["type"] = Pascal(skill["skill_type"]!.GetValue<string>()),
                ["maxLevel"] = skill["max_level"]?.DeepClone(),
                ["xpCurve"] = skill["xp_curve"]?.DeepClone(),
                ["effects"] = skill["effects"]?.DeepClone()
            });

        var entries = Rows(bundle, "loot_table_entries").ToLookup(e => e["loot_table_code"]!.GetValue<string>());
        foreach (var table in Rows(bundle, "loot_tables"))
        {
            var code = table["code"]!.GetValue<string>();
            await SendAsync(http, $"{root}/loot-tables", new JsonObject
            {
                ["code"] = code,
                ["name"] = table["name"]?.DeepClone(),
                ["rollsMin"] = table["rolls_min"]?.DeepClone(),
                ["rollsMax"] = table["rolls_max"]?.DeepClone(),
                ["entries"] = new JsonArray(entries[code].Select(e => (JsonNode)new JsonObject
                {
                    ["itemCode"] = e["item_code"]?.DeepClone(),
                    ["tier"] = e["tier"]?.DeepClone(),
                    ["weight"] = e["weight"]?.DeepClone(),
                    ["minQuantity"] = e["min_qty"]?.DeepClone(),
                    ["maxQuantity"] = e["max_qty"]?.DeepClone()
                }).ToArray())
            });
        }

        foreach (var enemy in Rows(bundle, "enemy_types"))
            await SendAsync(http, $"{root}/enemy-types", new JsonObject
            {
                ["code"] = enemy["code"]?.DeepClone(),
                ["name"] = enemy["name"]?.DeepClone(),
                ["archetype"] = enemy["archetype"]?.DeepClone(),
                ["isBoss"] = enemy["is_boss"]?.DeepClone(),
                ["maxHp"] = enemy["max_hp"]?.DeepClone(),
                ["moveSpeed"] = enemy["move_speed"]?.DeepClone(),
                ["visionRange"] = enemy["vision_range"]?.DeepClone(),
                ["visionAngleDegrees"] = enemy["vision_angle_deg"]?.DeepClone(),
                ["hearingRange"] = enemy["hearing_range"]?.DeepClone(),
                ["accuracy"] = enemy["accuracy"]?.DeepClone(),
                ["weaponItemCode"] = enemy["weapon_item_code"]?.DeepClone(),
                ["lootTableCode"] = enemy["loot_table_code"]?.DeepClone(),
                ["fsmParams"] = enemy["fsm_params"]?.DeepClone()
            });

        var placements = Rows(bundle, "enemy_placements").ToLookup(p => p["map_code"]!.GetValue<string>());
        var mapLoot = Rows(bundle, "map_loot_tables").ToLookup(m => m["map_code"]!.GetValue<string>());
        foreach (var map in Rows(bundle, "maps"))
        {
            var code = map["code"]!.GetValue<string>();
            await SendAsync(http, $"{root}/maps", new JsonObject
            {
                ["code"] = code,
                ["name"] = map["name"]?.DeepClone(),
                ["sceneKey"] = map["scene_key"]?.DeepClone(),
                ["isSafeCamp"] = map["is_safe_camp"]?.DeepClone(),
                ["sortOrder"] = map["sort_order"]?.DeepClone(),
                ["navGraph"] = map["nav_graph"]?.DeepClone(),
                ["layout"] = map["layout"]?.DeepClone(),
                ["enemyPlacements"] = new JsonArray(placements[code].Select(p => (JsonNode)new JsonObject
                {
                    ["enemyTypeCode"] = p["enemy_type_code"]?.DeepClone(),
                    ["squadTag"] = p["squad_tag"]?.DeepClone(),
                    ["posX"] = p["pos_x"]?.DeepClone(),
                    ["posY"] = p["pos_y"]?.DeepClone(),
                    ["facingDegrees"] = p["facing_deg"]?.DeepClone(),
                    ["patrolRoute"] = p["patrol_route"]?.DeepClone(),
                    ["spawnCondition"] = p["spawn_condition"]?.DeepClone()
                }).ToArray()),
                ["lootTables"] = new JsonArray(mapLoot[code].Select(m => (JsonNode)new JsonObject
                {
                    ["lootTableCode"] = m["loot_table_code"]?.DeepClone(),
                    ["containerTag"] = m["container_tag"]?.DeepClone()
                }).ToArray())
            });
        }

        var ingredients = Rows(bundle, "crafting_recipe_ingredients").ToLookup(i => i["recipe_code"]!.GetValue<string>());
        foreach (var recipe in Rows(bundle, "crafting_recipes"))
        {
            var code = recipe["code"]!.GetValue<string>();
            await SendAsync(http, $"{root}/recipes", new JsonObject
            {
                ["code"] = code,
                ["name"] = recipe["name"]?.DeepClone(),
                ["outputItemCode"] = recipe["output_item_code"]?.DeepClone(),
                ["outputQuantity"] = recipe["output_quantity"]?.DeepClone(),
                ["craftTimeSeconds"] = recipe["craft_time_s"]?.DeepClone(),
                ["requiredSkillCode"] = recipe["required_skill_code"]?.DeepClone(),
                ["requiredSkillLevel"] = recipe["required_skill_level"]?.DeepClone(),
                ["station"] = recipe["station"]?.DeepClone(),
                ["ingredients"] = new JsonArray(ingredients[code].Select(i => (JsonNode)new JsonObject
                {
                    ["itemCode"] = i["item_code"]?.DeepClone(),
                    ["quantity"] = i["quantity"]?.DeepClone()
                }).ToArray())
            });
        }

        var rewards = Rows(bundle, "quest_rewards").ToLookup(r => r["quest_code"]!.GetValue<string>());
        // Prerequisites must exist first, so quests go in sort order
        foreach (var quest in Rows(bundle, "quests").OrderBy(q => q["sort_order"]!.GetValue<int>()))
        {
            var code = quest["code"]!.GetValue<string>();
            await SendAsync(http, $"{root}/quests", new JsonObject
            {
                ["code"] = code,
                ["title"] = quest["title"]?.DeepClone(),
                ["description"] = quest["description"]?.DeepClone(),
                ["isMain"] = quest["is_main"]?.DeepClone(),
                ["sortOrder"] = quest["sort_order"]?.DeepClone(),
                ["objectives"] = quest["objectives"]?.DeepClone(),
                ["prerequisites"] = quest["prerequisites"]?.DeepClone(),
                ["rewardXp"] = quest["reward_xp"]?.DeepClone(),
                ["rewards"] = new JsonArray(rewards[code].Select(r => (JsonNode)new JsonObject
                {
                    ["itemCode"] = r["item_code"]?.DeepClone(),
                    ["quantity"] = r["quantity"]?.DeepClone()
                }).ToArray())
            });
        }
        Console.WriteLine("  skills, loot tables, enemy types, maps, recipes and quests sent");

        var details = await http.GetFromJsonAsync<JsonObject>(root) ?? throw new HttpRequestException("Empty version response.");
        var result = await SendAsync(http, $"{root}/validate", new JsonObject { ["revision"] = details["version"]!["revision"]!.DeepClone() });
        if (result["isValid"]!.GetValue<bool>())
        {
            Console.WriteLine("Draft is valid. Submit it for review in the web app (Content versions).");
            return true;
        }
        foreach (var error in result["errors"]!.AsArray())
            Console.Error.WriteLine($"  INVALID {error!["path"]}: {error["message"]}");
        return false;
    }

    private static async Task<JsonObject> SendAsync(HttpClient http, string path, JsonObject body)
    {
        using var response = await http.PostAsJsonAsync(path, body);
        var text = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"POST {path} -> {(int)response.StatusCode}: {text}");
        return JsonNode.Parse(text)!.AsObject();
    }

    private static IEnumerable<JsonNode> Rows(JsonObject bundle, string key) => bundle[key]!.AsArray().Select(r => r!);

    private static Dictionary<string, JsonNode> ByCode(JsonObject bundle, string key, string codeField) =>
        Rows(bundle, key).ToDictionary(r => r[codeField]!.GetValue<string>());

    // "quest_item" -> "QuestItem", the member names the API parses
    private static string Pascal(string value) =>
        Regex.Replace(value, "(?:^|_)([a-z])", m => m.Groups[1].Value.ToUpperInvariant());
}
