using System.Text.Json.Nodes;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Entities;
using Shouldly;

namespace ShadowVale.BLL.Tests.Content;

public class ContentBundleValidatorTests
{
    private readonly ContentBundleValidator _validator = new();
    private static JsonObject Demo() => JsonNode.Parse(File.ReadAllText(
        Path.Combine(AppContext.BaseDirectory, "Content", "demo-bundle.json")))!.AsObject();

    [Fact]
    public void Difficulty_validates_profiles_and_layout_ownership()
    {
        var bundle = GameCatalogService.GetSnapshot()["authoringBundle"]!.AsObject();
        var maps = bundle["maps"]!.AsArray();
        var index = maps.ToList().FindIndex(row => row?["code"]?.GetValue<string>() == "map01");
        var rules = maps[index]!["layout"]!["game_rules"]!.AsObject();
        var difficulty = JsonNode.Parse("""
            {"active_level":"hard","levels":{
              "easy":{"guard_damage_percent":80,"guard_vision_percent":85,"layout_preset_id":"original"},
              "normal":{"guard_damage_percent":100,"guard_vision_percent":100,"layout_preset_id":"forest_south"},
              "hard":{"guard_damage_percent":120,"guard_vision_percent":110,"layout_preset_id":"forest_north"}
            }}
            """)!;
        rules["difficulty"] = difficulty;
        _validator.Validate(bundle).ShouldBeEmpty();

        difficulty["levels"]!["hard"]!["layout_preset_id"] = "canal_north";
        _validator.Validate(bundle).ShouldContain(e =>
            e.Path == $"/maps/{index}/layout/game_rules/difficulty/levels/hard/layout_preset_id");

        difficulty["levels"]!["hard"]!["guard_damage_percent"] = 151;
        _validator.Validate(bundle).ShouldContain(e =>
            e.Path.EndsWith("/difficulty/levels/hard/guard_damage_percent"));
    }

    [Fact]
    public void Frontend_demo_matches_backend_contract() => _validator.Validate(Demo()).ShouldBeEmpty();

    // Seed:DemoData=true publishes it, so the game API must serve a bundle that passes the contract
    [Fact]
    public void Seeded_demo_bundle_matches_backend_contract()
    {
        using var stream = typeof(ContentBundleValidator).Assembly.GetManifestResourceStream("ShadowVale.BLL.Seeding.demo_bundle.json")!;
        _validator.Validate(JsonNode.Parse(stream)!.AsObject()).ShouldBeEmpty();
    }

    [Fact]
    public void Invalid_schema_returns_field_paths_without_crashing()
    {
        var bundle = Demo();
        bundle["items"]![0]!["max_stack"] = 0;
        bundle["maps"] = "wrong type";
        var errors = _validator.Validate(bundle);
        errors.ShouldNotBeEmpty();
        errors.ShouldContain(e => e.Path.StartsWith("/items"));
        errors.ShouldContain(e => e.Path.StartsWith("/maps"));
    }

    [Fact]
    public void Unknown_and_wrong_type_references_are_rejected()
    {
        var bundle = Demo();
        bundle["weapons"]![0]!["ammo_item_code"] = "missing_ammo";
        bundle["consumables"]![0]!["item_code"] = bundle["items"]![0]!["code"]!.DeepClone();
        var errors = _validator.Validate(bundle);
        errors.ShouldContain(e => e.Path == "/weapons/0/ammo_item_code");
        errors.ShouldContain(e => e.Path == "/consumables/0/item_code");
    }

    [Fact]
    public void Duplicate_codes_are_rejected()
    {
        var bundle = Demo();
        bundle["items"]!.AsArray().Add(bundle["items"]![0]!.DeepClone());
        _validator.Validate(bundle).ShouldContain(e => e.Message.Contains("Duplicate"));
    }

    [Fact]
    public void Camp_and_related_ranges_are_checked()
    {
        var bundle = Demo();
        foreach (var map in bundle["maps"]!.AsArray()) map!["is_safe_camp"] = false;
        bundle["loot_tables"]![0]!["rolls_min"] = 5;
        bundle["loot_tables"]![0]!["rolls_max"] = 1;
        _validator.Validate(bundle).ShouldContain(e => e.Path == "/maps");
        _validator.Validate(bundle).ShouldContain(e => e.Path == "/loot_tables/0");
    }

    [Fact]
    public void Quest_dependency_cycles_are_rejected()
    {
        var bundle = Demo();
        var quest = bundle["quests"]![0]!;
        quest["prerequisites"] = new JsonArray(quest["code"]!.DeepClone());
        _validator.Validate(bundle).ShouldContain(e => e.Path == "/quests");
    }

    [Fact]
    public void Builder_serializes_json_values_and_flags_external_references()
    {
        var version = new ContentVersion { VersionNo = 1, Label = "Test" };
        var item = new Item { Code = "rifle", Name = "Rifle", Type = ItemType.Weapon,
            Stats = "{\"damage\":2}", ContentVersionId = version.Id };
        item.Weapon = new Weapon { ItemId = item.Id, Class = WeaponClass.Rifle, Damage = 10,
            FireRate = 1, EffectiveRange = 20, MaxDurability = 100, AmmoItemId = Guid.NewGuid() };
        version.Items.Add(item);
        version.Maps.Add(new Map { Code = "camp", Name = "Camp", SceneKey = "camp", IsSafeCamp = true,
            ContentVersionId = version.Id });
        var bundle = ContentBundleBuilder.Build(version);
        bundle["items"]![0]!["stats"]!.AsObject()["damage"]!.GetValue<int>().ShouldBe(2);
        _validator.Validate(bundle).ShouldContain(e => e.Path == "/weapons/0/ammo_item_code");
    }

    [Fact]
    public void Missing_subtype_and_melee_ammo_are_rejected()
    {
        var bundle = Demo();
        bundle["weapons"]![0]!["weapon_class"] = "melee";
        _validator.Validate(bundle).ShouldContain(e => e.Path == "/weapons/0");
        bundle["consumables"] = new JsonArray();
        _validator.Validate(bundle).ShouldContain(e => e.Message.Contains("exactly one consumables"));
    }
}
