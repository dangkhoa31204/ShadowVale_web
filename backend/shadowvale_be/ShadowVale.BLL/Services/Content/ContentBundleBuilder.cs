using System.Text.Json;
using System.Text.Json.Nodes;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services.Content;

public sealed record BundleBuildResult(JsonObject Bundle, IReadOnlyList<ContentIssueDto> Issues)
{
    public bool IsValid => Issues.Count == 0;
}

// Turns the rows of one content version into the JSON bundle the game downloads, and checks that the content is
// consistent on the way (every reference resolves, one Safe Camp, nav graphs well formed...). A bundle with issues
// is never stored as the version's bundle, so it can never be published.
//
// Layout follows the game's fallback bundle (snake_case, "id" = the row's code, sections items / weapons /
// enemy_archetypes / loot_tables / craft_recipes / quests / maps / ai_settings), plus skills and consumables.
public static class ContentBundleBuilder
{
    public const int SchemaVersion = 1;

    // Section name -> JSON array, in the order they appear in the bundle (also used by compare)
    public static readonly string[] Sections =
        ["items", "weapons", "consumables", "skills", "enemy_archetypes", "loot_tables", "craft_recipes", "quests", "maps"];

    public static BundleBuildResult Build(ContentSnapshot s, JsonNode? aiSettings)
    {
        var issues = new List<ContentIssueDto>();
        void Issue(string path, string message) => issues.Add(new ContentIssueDto(path, message));

        var itemById = s.Items.ToDictionary(i => i.Id);
        var weaponItemCode = s.Items.Where(i => i.Weapon is not null).ToDictionary(i => i.Weapon!.Id, i => i.Code);
        var skillById = s.Skills.ToDictionary(k => k.Id);
        var lootById = s.LootTables.ToDictionary(l => l.Id);
        var enemyById = s.EnemyTypes.ToDictionary(e => e.Id);
        string ItemCode(Guid id) => itemById.TryGetValue(id, out var item) ? item.Code : "?";

        // ---- whole-version rules
        if (s.Items.Count == 0)
            Issue("items", "The version has no items.");
        var safeCamps = s.Maps.Where(m => m.IsSafeCamp).ToList();
        if (s.Maps.Count == 0)
            Issue("maps", "The version has no maps.");
        else if (safeCamps.Count != 1)
            Issue("maps", $"The version needs exactly one Safe Camp map, but has {safeCamps.Count}.");

        // ---- items, weapons, consumables
        var items = new JsonArray();
        var weapons = new JsonArray();
        var consumables = new JsonArray();
        foreach (var item in s.Items)
        {
            var path = $"items[{item.Code}]";
            items.Add(new JsonObject
            {
                ["id"] = item.Code,
                ["display_name"] = item.Name,
                ["description"] = item.Description,
                ["category"] = Lower(item.Type),
                ["rarity"] = Lower(item.Rarity),
                ["stack_max"] = item.MaxStack,
                ["weight"] = item.Weight,
                ["base_value"] = item.BaseValue,
                ["icon_key"] = item.IconKey,
                ["stats"] = Parse(item.Stats)
            });

            if (item.Type == ItemType.Weapon && item.Weapon is null)
                Issue(path, "A Weapon item has no weapon stats.");
            if (item.Type != ItemType.Weapon && item.Weapon is not null)
                Issue(path, "Only a Weapon item can have weapon stats.");
            if (item.Type == ItemType.Consumable && item.Consumable is null)
                Issue(path, "A Consumable item has no consumable stats.");
            if (item.Type != ItemType.Consumable && item.Consumable is not null)
                Issue(path, "Only a Consumable item can have consumable stats.");

            if (item.Weapon is { } w)
            {
                var ammo = w.AmmoItemId is { } ammoId && itemById.TryGetValue(ammoId, out var a) ? a : null;
                if (w.Class != WeaponClass.Melee)
                {
                    if (ammo is null || ammo.Type != ItemType.Ammo)
                        Issue($"{path}.weapon.ammo", "A ranged weapon needs an ammo item of type Ammo.");
                    if (w.MagazineSize is null || w.ReloadTimeSeconds is null)
                        Issue($"{path}.weapon", "A ranged weapon needs a magazine size and a reload time.");
                }

                weapons.Add(new JsonObject
                {
                    ["id"] = item.Code,
                    ["display_name"] = item.Name,
                    ["class"] = Lower(w.Class),
                    ["damage"] = w.Damage,
                    ["fire_rate"] = w.FireRate,
                    ["range"] = w.EffectiveRange,
                    ["ammo_type"] = ammo?.Code,
                    ["magazine_size"] = w.MagazineSize,
                    ["reload_seconds"] = w.ReloadTimeSeconds,
                    ["durability_max"] = w.MaxDurability,
                    ["durability_per_shot"] = w.DurabilityPerUse,
                    ["noise_radius"] = w.NoiseRadius,
                    ["suppressed"] = w.IsSuppressed
                });
            }

            if (item.Consumable is { } c)
            {
                consumables.Add(new JsonObject
                {
                    ["id"] = item.Code,
                    ["heal_hp"] = c.HealHp,
                    ["restore_stamina"] = c.RestoreStamina,
                    ["use_seconds"] = c.UseTimeSeconds,
                    ["cures"] = new JsonArray(c.Cures.Select(x => (JsonNode?)JsonValue.Create(x)).ToArray()),
                    ["extra_effects"] = Parse(c.ExtraEffects)
                });
            }
        }

        // ---- skills
        var skills = new JsonArray();
        foreach (var skill in s.Skills)
        {
            var curve = Parse(skill.XpCurve) as JsonArray;
            if (curve is null || curve.Any(x => x is not JsonValue v || !v.TryGetValue<decimal>(out var n) || n < 0))
                Issue($"skills[{skill.Code}]", "The XP curve must be a list of non-negative numbers.");
            else
            {
                var values = curve.Select(x => x!.GetValue<decimal>()).ToList();
                if (values.Zip(values.Skip(1), (a, b) => b < a).Any(x => x))
                    Issue($"skills[{skill.Code}]", "The XP curve must not decrease from one level to the next.");
            }

            skills.Add(new JsonObject
            {
                ["id"] = skill.Code,
                ["display_name"] = skill.Name,
                ["type"] = Lower(skill.Type),
                ["max_level"] = skill.MaxLevel,
                ["xp_curve"] = curve ?? new JsonArray(),
                ["effects"] = Parse(skill.Effects)
            });
        }

        // ---- loot tables
        var lootTables = new JsonArray();
        foreach (var table in s.LootTables)
        {
            var path = $"loot_tables[{table.Code}]";
            if (table.Entries.Count == 0)
                Issue(path, "The loot table has no entries.");
            if (table.RollsMin > table.RollsMax)
                Issue(path, "Rolls min is greater than rolls max.");
            foreach (var entry in table.Entries.Where(e => e.MinQuantity > e.MaxQuantity || e.Weight <= 0))
                Issue(path, $"Entry '{ItemCode(entry.ItemId)}' needs a positive weight and min quantity <= max quantity.");

            lootTables.Add(new JsonObject
            {
                ["id"] = table.Code,
                ["display_name"] = table.Name,
                ["rolls_min"] = table.RollsMin,
                ["rolls_max"] = table.RollsMax,
                ["entries"] = new JsonArray(table.Entries.OrderBy(e => e.Tier).ThenBy(e => ItemCode(e.ItemId)).Select(e => (JsonNode?)new JsonObject
                {
                    ["item_id"] = ItemCode(e.ItemId),
                    ["tier"] = e.Tier,
                    ["weight"] = e.Weight,
                    ["min"] = e.MinQuantity,
                    ["max"] = e.MaxQuantity
                }).ToArray())
            });
        }

        // ---- enemy types: the FSM parameters are merged into the entry, so the game reads them next to the base stats
        var enemies = new JsonArray();
        foreach (var enemy in s.EnemyTypes)
        {
            var path = $"enemy_archetypes[{enemy.Code}]";
            if (enemy.WeaponId is { } weaponId && !weaponItemCode.ContainsKey(weaponId))
                Issue(path, "The weapon does not exist.");
            if (enemy.LootTableId is { } lootId && !lootById.ContainsKey(lootId))
                Issue(path, "The loot table does not exist.");

            var entry = new JsonObject
            {
                ["id"] = enemy.Code,
                ["display_name"] = enemy.Name,
                ["archetype"] = enemy.Archetype,
                ["is_boss"] = enemy.IsBoss,
                ["max_hp"] = enemy.MaxHp,
                ["move_speed"] = enemy.MoveSpeed,
                ["vision_range"] = enemy.VisionRange,
                ["vision_angle"] = enemy.VisionAngleDegrees,
                ["hearing_range"] = enemy.HearingRange,
                ["accuracy"] = enemy.Accuracy,
                ["weapon_id"] = enemy.WeaponId is { } wid && weaponItemCode.TryGetValue(wid, out var wcode) ? wcode : null,
                ["loot_table_id"] = enemy.LootTableId is { } lid && lootById.TryGetValue(lid, out var lt) ? lt.Code : null
            };
            if (Parse(enemy.FsmParams) is JsonObject fsm)
            {
                foreach (var (key, value) in fsm)
                {
                    if (entry.ContainsKey(key))
                        Issue(path, $"FSM parameter '{key}' clashes with a base stat of the same name.");
                    else
                        entry[key] = value?.DeepClone();
                }
            }
            enemies.Add(entry);
        }

        // ---- crafting recipes
        var recipes = new JsonArray();
        foreach (var recipe in s.CraftingRecipes)
        {
            var path = $"craft_recipes[{recipe.Code}]";
            if (recipe.Ingredients.Count == 0)
                Issue(path, "The recipe has no ingredients.");
            if (recipe.Ingredients.Any(i => i.ItemId == recipe.OutputItemId))
                Issue(path, "The output is also an ingredient.");
            var skill = recipe.RequiredSkillId is { } sid && skillById.TryGetValue(sid, out var sk) ? sk : null;
            if (recipe.RequiredSkillId is not null && skill is null)
                Issue(path, "The required skill does not exist.");
            if (skill is not null && recipe.RequiredSkillLevel > skill.MaxLevel)
                Issue(path, $"Required skill level {recipe.RequiredSkillLevel} is above the max level of '{skill.Code}' ({skill.MaxLevel}).");

            recipes.Add(new JsonObject
            {
                ["id"] = recipe.Code,
                ["display_name"] = recipe.Name,
                ["output_item_id"] = ItemCode(recipe.OutputItemId),
                ["output_count"] = recipe.OutputQuantity,
                ["required_skill"] = skill?.Code,
                ["required_skill_level"] = recipe.RequiredSkillLevel,
                ["craft_seconds"] = recipe.CraftTimeSeconds,
                ["station"] = recipe.Station,
                ["inputs"] = new JsonArray(recipe.Ingredients.OrderBy(i => ItemCode(i.ItemId)).Select(i => (JsonNode?)new JsonObject
                {
                    ["item_id"] = ItemCode(i.ItemId),
                    ["count"] = i.Quantity
                }).ToArray())
            });
        }

        // ---- quests
        var quests = new JsonArray();
        var questCodes = s.Quests.Select(q => q.Code).ToHashSet();
        foreach (var quest in s.Quests)
        {
            var path = $"quests[{quest.Code}]";
            var objectives = Parse(quest.Objectives) as JsonArray;
            if (objectives is null || objectives.Count == 0 || objectives.Any(o => o is not JsonObject obj || !obj.ContainsKey("type")))
                Issue(path, "A quest needs at least one objective, each an object with a 'type'.");
            foreach (var missing in quest.Prerequisites.Where(p => !questCodes.Contains(p)))
                Issue(path, $"Prerequisite quest '{missing}' does not exist.");

            quests.Add(new JsonObject
            {
                ["id"] = quest.Code,
                ["title"] = quest.Title,
                ["description"] = quest.Description,
                ["is_main"] = quest.IsMain,
                ["sort_order"] = quest.SortOrder,
                ["prerequisites"] = new JsonArray(quest.Prerequisites.Select(p => (JsonNode?)JsonValue.Create(p)).ToArray()),
                ["objectives"] = objectives ?? new JsonArray(),
                ["reward_xp"] = quest.RewardXp,
                ["rewards"] = new JsonArray(quest.Rewards.OrderBy(r => ItemCode(r.ItemId)).Select(r => (JsonNode?)new JsonObject
                {
                    ["item_id"] = ItemCode(r.ItemId),
                    ["count"] = r.Quantity
                }).ToArray())
            });
        }
        foreach (var cycle in FindPrerequisiteCycle(s.Quests))
            Issue($"quests[{cycle}]", "The quest is part of a prerequisite cycle, so it can never be started.");

        // ---- maps
        var maps = new JsonArray();
        foreach (var map in s.Maps.OrderBy(m => m.SortOrder).ThenBy(m => m.Code))
        {
            var path = $"maps[{map.Code}]";
            var nav = Parse(map.NavGraph) as JsonObject;
            var nodes = nav?["nodes"] as JsonArray ?? new JsonArray();
            if (map.EnemyPlacements.Count > 0 && nodes.Count == 0)
                Issue(path, "A map with enemies needs a nav graph with nodes for the squad coordinator.");
            CheckNavNodes(nodes, path, Issue);

            foreach (var p in map.EnemyPlacements.Where(p => !enemyById.ContainsKey(p.EnemyTypeId)))
                Issue(path, "A placement uses an enemy type that does not exist.");
            foreach (var l in map.LootTables.Where(l => !lootById.ContainsKey(l.LootTableId)))
                Issue(path, "A container uses a loot table that does not exist.");

            maps.Add(new JsonObject
            {
                ["id"] = map.Code,
                ["display_name"] = map.Name,
                ["scene_name"] = map.SceneKey,
                ["is_safe_camp"] = map.IsSafeCamp,
                ["sort_order"] = map.SortOrder,
                ["layout"] = Parse(map.Layout),
                ["nav_graph_nodes"] = nodes.DeepClone(),
                ["enemy_placements"] = new JsonArray(map.EnemyPlacements.OrderBy(p => p.SquadTag).ThenBy(p => p.CreatedAt).Select(p => (JsonNode?)new JsonObject
                {
                    ["squad_id"] = p.SquadTag,
                    ["archetype_id"] = enemyById.TryGetValue(p.EnemyTypeId, out var et) ? et.Code : null,
                    ["x"] = p.PosX,
                    ["y"] = p.PosY,
                    ["facing"] = p.FacingDegrees,
                    ["patrol_route"] = Parse(p.PatrolRoute),
                    ["spawn_condition"] = p.SpawnCondition is null ? null : Parse(p.SpawnCondition)
                }).ToArray()),
                ["loot_placements"] = new JsonArray(map.LootTables.OrderBy(l => l.ContainerTag).Select(l => (JsonNode?)new JsonObject
                {
                    ["container_id"] = l.ContainerTag,
                    ["loot_table_id"] = lootById.TryGetValue(l.LootTableId, out var lt) ? lt.Code : null
                }).ToArray())
            });
        }

        var bundle = new JsonObject
        {
            ["bundle_version"] = s.Version.VersionNo.ToString(),
            ["schema_version"] = SchemaVersion,
            ["label"] = s.Version.Label,
            ["items"] = items,
            ["weapons"] = weapons,
            ["consumables"] = consumables,
            ["skills"] = skills,
            ["enemy_archetypes"] = enemies,
            ["loot_tables"] = lootTables,
            ["craft_recipes"] = recipes,
            ["quests"] = quests,
            ["maps"] = maps,
            ["ai_settings"] = aiSettings?.DeepClone() ?? new JsonObject()
        };
        return new BundleBuildResult(bundle, issues);
    }

    // Node ids must be unique integers and every neighbour must be a node of the same graph
    private static void CheckNavNodes(JsonArray nodes, string path, Action<string, string> issue)
    {
        var ids = new HashSet<long>();
        foreach (var node in nodes)
        {
            if (node is not JsonObject n || !TryGetLong(n["id"], out var id))
            {
                issue($"{path}.nav_graph", "Every node needs an integer 'id'.");
                return;
            }
            if (!ids.Add(id))
                issue($"{path}.nav_graph", $"Node id {id} appears more than once.");
        }

        foreach (var node in nodes.OfType<JsonObject>())
        {
            if (node["neighbors"] is not JsonArray neighbors)
            {
                issue($"{path}.nav_graph", $"Node {node["id"]} needs a 'neighbors' list.");
                continue;
            }
            foreach (var neighbor in neighbors)
            {
                if (!TryGetLong(neighbor, out var other) || !ids.Contains(other))
                    issue($"{path}.nav_graph", $"Node {node["id"]} has a neighbour ({neighbor}) that is not a node of the graph.");
            }
        }
    }

    private static bool TryGetLong(JsonNode? node, out long value)
    {
        value = 0;
        return node is JsonValue v && v.TryGetValue(out value);
    }

    // Quests that sit on a prerequisite cycle (depth-first search)
    private static IEnumerable<string> FindPrerequisiteCycle(List<Quest> quests)
    {
        var graph = quests.ToDictionary(q => q.Code, q => q.Prerequisites);
        var state = new Dictionary<string, int>(); // 1 = visiting, 2 = done
        var cyclic = new HashSet<string>();

        bool Visit(string code, Stack<string> path)
        {
            if (state.TryGetValue(code, out var s))
            {
                if (s == 1)
                {
                    foreach (var c in path.TakeWhile(p => p != code).Append(code))
                        cyclic.Add(c);
                    return true;
                }
                return false;
            }
            state[code] = 1;
            path.Push(code);
            foreach (var next in graph.GetValueOrDefault(code) ?? [])
            {
                if (graph.ContainsKey(next))
                    Visit(next, path);
            }
            path.Pop();
            state[code] = 2;
            return false;
        }

        foreach (var code in graph.Keys)
            Visit(code, new Stack<string>());
        return cyclic.Order();
    }

    private static string Lower<TEnum>(TEnum value) where TEnum : struct, Enum => value.ToString().ToLowerInvariant();

    private static JsonNode? Parse(string json) => JsonNode.Parse(json);
}
