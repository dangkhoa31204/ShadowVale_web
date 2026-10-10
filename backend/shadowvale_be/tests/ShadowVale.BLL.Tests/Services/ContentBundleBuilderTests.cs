using ShadowVale.BLL.Services.Content;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class ContentBundleBuilderTests
{
    private static Item Ammo(string code = "ammo_rifle") => new() { Code = code, Name = code, Type = ItemType.Ammo, MaxStack = 90 };

    private static Item Rifle(Item ammo, string code = "rifle") => new()
    {
        Code = code, Name = code, Type = ItemType.Weapon,
        Weapon = new Weapon
        {
            Class = WeaponClass.Rifle, Damage = 24, FireRate = 6.5m, EffectiveRange = 40, MagazineSize = 30, ReloadTimeSeconds = 2.4m,
            AmmoItemId = ammo.Id, MaxDurability = 100, DurabilityPerUse = 0.12m, NoiseRadius = 18
        }
    };

    private static Map SafeCamp() => new() { Code = "camp", Name = "Camp", SceneKey = "Camp", IsSafeCamp = true };

    private const string TwoNodes = """{ "nodes": [ { "id": 0, "neighbors": [1] }, { "id": 1, "neighbors": [0] } ] }""";

    private static ContentSnapshot Snapshot(
        List<Item>? items = null, List<Map>? maps = null, List<EnemyType>? enemies = null, List<Quest>? quests = null,
        List<CraftingRecipe>? recipes = null, List<Skill>? skills = null, List<LootTable>? lootTables = null)
    {
        var ammo = Ammo();
        return new ContentSnapshot(
            new ContentVersion { Label = "test", VersionNo = 3 },
            items ?? [ammo, Rifle(ammo)], skills ?? [], lootTables ?? [], enemies ?? [], maps ?? [SafeCamp()], recipes ?? [], quests ?? []);
    }

    private static IEnumerable<string> Messages(BundleBuildResult result) => result.Issues.Select(i => $"{i.Path}: {i.Message}");

    [Fact]
    public void ValidContent_BuildsBundleWithoutIssues()
    {
        var ammo = Ammo();
        var rifle = Rifle(ammo);
        var grunt = new EnemyType { Code = "grunt", Name = "Grunt", Archetype = "rifleman", MaxHp = 80, WeaponId = rifle.Weapon!.Id, FsmParams = """{ "alert_decay_seconds": 8 }""" };
        var level = new Map
        {
            Code = "docks", Name = "Docks", SceneKey = "Docks", NavGraph = TwoNodes,
            EnemyPlacements = [new EnemyPlacement { EnemyTypeId = grunt.Id, SquadTag = "squad_a", PosX = 1, PosY = 2 }]
        };

        var result = ContentBundleBuilder.Build(Snapshot([ammo, rifle], [SafeCamp(), level], [grunt]), null);

        result.IsValid.ShouldBeTrue(string.Join("; ", Messages(result)));
        var bundle = result.Bundle;
        bundle["bundle_version"]!.GetValue<string>().ShouldBe("3");
        bundle["weapons"]![0]!["ammo_type"]!.GetValue<string>().ShouldBe("ammo_rifle");
        bundle["items"]![1]!["category"]!.GetValue<string>().ShouldBe("weapon");
        // FSM parameters are merged next to the base stats
        bundle["enemy_archetypes"]![0]!["alert_decay_seconds"]!.GetValue<int>().ShouldBe(8);
        bundle["enemy_archetypes"]![0]!["weapon_id"]!.GetValue<string>().ShouldBe("rifle");
        bundle["maps"]![1]!["enemy_placements"]![0]!["archetype_id"]!.GetValue<string>().ShouldBe("grunt");
    }

    [Fact]
    public void SameContent_ProducesSameBundleText()
    {
        var snapshot = Snapshot();

        ContentBundleBuilder.Build(snapshot, null).Bundle.ToJsonString()
            .ShouldBe(ContentBundleBuilder.Build(snapshot, null).Bundle.ToJsonString());
    }

    [Fact]
    public void EmptyVersion_ReportsMissingItemsAndMaps()
    {
        var result = ContentBundleBuilder.Build(Snapshot([], []), null);

        Messages(result).ShouldContain(m => m.StartsWith("items:"));
        Messages(result).ShouldContain(m => m.StartsWith("maps:"));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(2)]
    public void NeedsExactlyOneSafeCamp(int safeCamps)
    {
        var maps = Enumerable.Range(0, Math.Max(safeCamps, 1))
            .Select(i => new Map { Code = $"map{i}", Name = "m", SceneKey = "s", IsSafeCamp = i < safeCamps }).ToList();

        var result = ContentBundleBuilder.Build(Snapshot(maps: maps), null);

        Messages(result).ShouldContain(m => m.Contains("exactly one Safe Camp"));
    }

    [Fact]
    public void RangedWeaponWithoutAmmo_IsReported()
    {
        var rifle = Rifle(Ammo());
        rifle.Weapon!.AmmoItemId = null;

        var result = ContentBundleBuilder.Build(Snapshot([rifle]), null);

        Messages(result).ShouldContain(m => m.StartsWith("items[rifle].weapon.ammo"));
    }

    [Fact]
    public void WeaponItemWithoutStats_IsReported()
    {
        var result = ContentBundleBuilder.Build(Snapshot([new Item { Code = "gun", Name = "gun", Type = ItemType.Weapon }]), null);

        Messages(result).ShouldContain(m => m.Contains("no weapon stats"));
    }

    [Fact]
    public void NavGraph_NeighbourOutsideGraph_IsReported()
    {
        var level = new Map { Code = "docks", Name = "Docks", SceneKey = "Docks", NavGraph = """{ "nodes": [ { "id": 0, "neighbors": [7] } ] }""" };

        var result = ContentBundleBuilder.Build(Snapshot(maps: [SafeCamp(), level]), null);

        Messages(result).ShouldContain(m => m.StartsWith("maps[docks].nav_graph") && m.Contains("neighbour"));
    }

    [Fact]
    public void MapWithEnemiesButNoNavGraph_IsReported()
    {
        var grunt = new EnemyType { Code = "grunt", Name = "Grunt", Archetype = "rifleman", MaxHp = 80 };
        var level = new Map
        {
            Code = "docks", Name = "Docks", SceneKey = "Docks",
            EnemyPlacements = [new EnemyPlacement { EnemyTypeId = grunt.Id }]
        };

        var result = ContentBundleBuilder.Build(Snapshot(maps: [SafeCamp(), level], enemies: [grunt]), null);

        Messages(result).ShouldContain(m => m.StartsWith("maps[docks]") && m.Contains("nav graph"));
    }

    [Fact]
    public void QuestPrerequisiteCycle_IsReportedForEveryQuestInIt()
    {
        var quests = new List<Quest>
        {
            new() { Code = "a", Title = "A", Objectives = """[{ "type": "kill" }]""", Prerequisites = ["b"] },
            new() { Code = "b", Title = "B", Objectives = """[{ "type": "kill" }]""", Prerequisites = ["a"] },
            new() { Code = "c", Title = "C", Objectives = """[{ "type": "kill" }]""", Prerequisites = ["a"] }
        };

        var result = ContentBundleBuilder.Build(Snapshot(quests: quests), null);

        var cyclic = result.Issues.Where(i => i.Message.Contains("cycle")).Select(i => i.Path).Order().ToList();
        cyclic.ShouldBe(["quests[a]", "quests[b]"]);
    }

    [Fact]
    public void QuestWithUnknownPrerequisiteOrBadObjectives_IsReported()
    {
        var quests = new List<Quest> { new() { Code = "a", Title = "A", Objectives = """[{ "count": 1 }]""", Prerequisites = ["ghost"] } };

        var result = ContentBundleBuilder.Build(Snapshot(quests: quests), null);

        Messages(result).ShouldContain(m => m.Contains("'type'"));
        Messages(result).ShouldContain(m => m.Contains("'ghost'"));
    }

    [Fact]
    public void Recipe_SkillLevelAboveMax_AndOutputAsIngredient_AreReported()
    {
        var ammo = Ammo();
        var skill = new Skill { Code = "engineering", Name = "Engineering", Type = SkillType.Engineering, MaxLevel = 3 };
        var recipe = new CraftingRecipe
        {
            Code = "r", Name = "R", OutputItemId = ammo.Id, RequiredSkillId = skill.Id, RequiredSkillLevel = 5,
            Ingredients = [new CraftingRecipeIngredient { ItemId = ammo.Id, Quantity = 1 }]
        };

        var result = ContentBundleBuilder.Build(Snapshot([ammo], skills: [skill], recipes: [recipe]), null);

        Messages(result).ShouldContain(m => m.Contains("above the max level"));
        Messages(result).ShouldContain(m => m.Contains("output is also an ingredient"));
    }

    [Fact]
    public void SkillXpCurve_MustNotDecrease()
    {
        var skill = new Skill { Code = "stealth", Name = "Stealth", Type = SkillType.Stealth, XpCurve = "[100, 50]" };

        var result = ContentBundleBuilder.Build(Snapshot(skills: [skill]), null);

        Messages(result).ShouldContain(m => m.StartsWith("skills[stealth]") && m.Contains("decrease"));
    }

    [Fact]
    public void FsmParamClashingWithBaseStat_IsReported()
    {
        var grunt = new EnemyType { Code = "grunt", Name = "Grunt", Archetype = "rifleman", MaxHp = 80, FsmParams = """{ "max_hp": 1 }""" };

        var result = ContentBundleBuilder.Build(Snapshot(enemies: [grunt]), null);

        Messages(result).ShouldContain(m => m.Contains("clashes"));
    }

    [Fact]
    public void LootTable_WithoutEntries_IsReported()
    {
        var result = ContentBundleBuilder.Build(Snapshot(lootTables: [new LootTable { Code = "loot", Name = "Loot" }]), null);

        Messages(result).ShouldContain(m => m.StartsWith("loot_tables[loot]") && m.Contains("no entries"));
    }
}
