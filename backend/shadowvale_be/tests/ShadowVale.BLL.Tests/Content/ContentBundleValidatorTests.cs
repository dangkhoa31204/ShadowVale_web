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
    public void Frontend_demo_matches_backend_contract() => _validator.Validate(Demo()).ShouldBeEmpty();

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
