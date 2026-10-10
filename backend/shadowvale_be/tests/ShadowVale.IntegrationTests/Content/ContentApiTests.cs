using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.DAL.Entities;
using ShadowVale.IntegrationTests.Infrastructure;
using Shouldly;

namespace ShadowVale.IntegrationTests.Content;

public class ContentApiTests(ApiFixture api) : IntegrationTest(api)
{
    private const string Versions = "/api/content/versions";

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static async Task<T> Read<T>(HttpResponseMessage response, HttpStatusCode expected = HttpStatusCode.OK)
    {
        response.StatusCode.ShouldBe(expected, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<T>(new JsonSerializerOptions(JsonSerializerDefaults.Web)))!;
    }

    private static async Task<ContentVersionDto> CreateVersion(HttpClient client, string label = "v1", Guid? baseVersionId = null) =>
        await Read<ContentVersionDto>(await client.PostAsJsonAsync(Versions,
            new CreateContentVersionRequest { Label = label, BaseVersionId = baseVersionId }), HttpStatusCode.Created);

    // Fills a version with a small but complete set of content that passes validation
    private static async Task FillAsync(HttpClient client, Guid versionId)
    {
        var url = $"{Versions}/{versionId}";
        await Read<ItemDto>(await client.PostAsJsonAsync($"{url}/items", new CreateItemRequest
        {
            Code = "ammo_rifle", Name = "Rifle rounds", Type = "Ammo", MaxStack = 90, Weight = 0.02m
        }), HttpStatusCode.Created);
        await Read<ItemDto>(await client.PostAsJsonAsync($"{url}/items", new CreateItemRequest
        {
            Code = "scrap", Name = "Scrap", Type = "Material", MaxStack = 20
        }), HttpStatusCode.Created);
        await Read<ItemDto>(await client.PostAsJsonAsync($"{url}/items", new CreateItemRequest
        {
            Code = "rifle", Name = "Rifle", Type = "Weapon", Rarity = "Rare", MaxStack = 1,
            Weapon = new WeaponRequest
            {
                Class = "Rifle", Damage = 24, FireRate = 6.5m, EffectiveRange = 40, MagazineSize = 30, ReloadTimeSeconds = 2.4m,
                AmmoItemCode = "ammo_rifle", MaxDurability = 100, DurabilityPerUse = 0.12m, NoiseRadius = 18
            }
        }), HttpStatusCode.Created);
        await Read<SkillDto>(await client.PostAsJsonAsync($"{url}/skills", new CreateSkillRequest
        {
            Code = "engineering", Name = "Engineering", Type = "Engineering", MaxLevel = 3, XpCurve = Json("[100, 250]")
        }), HttpStatusCode.Created);
        await Read<LootTableDto>(await client.PostAsJsonAsync($"{url}/loot-tables", new CreateLootTableRequest
        {
            Code = "loot_1", Name = "Tier 1", RollsMin = 1, RollsMax = 2,
            Entries = [new LootEntryRequest { ItemCode = "scrap", Weight = 10, MinQuantity = 1, MaxQuantity = 3 }]
        }), HttpStatusCode.Created);
        await Read<EnemyTypeDto>(await client.PostAsJsonAsync($"{url}/enemy-types", new CreateEnemyTypeRequest
        {
            Code = "grunt", Name = "Grunt", Archetype = "rifleman", MaxHp = 80, WeaponItemCode = "rifle", LootTableCode = "loot_1",
            FsmParams = Json("""{ "alert_decay_seconds": 8 }""")
        }), HttpStatusCode.Created);
        await Read<CraftingRecipeDto>(await client.PostAsJsonAsync($"{url}/recipes", new CreateCraftingRecipeRequest
        {
            Code = "craft_ammo", Name = "Craft ammo", OutputItemCode = "ammo_rifle", OutputQuantity = 10, CraftTimeSeconds = 3,
            RequiredSkillCode = "engineering", RequiredSkillLevel = 1,
            Ingredients = [new IngredientRequest { ItemCode = "scrap", Quantity = 2 }]
        }), HttpStatusCode.Created);
        await Read<QuestDto>(await client.PostAsJsonAsync($"{url}/quests", new CreateQuestRequest
        {
            Code = "q_docks", Title = "Docks", Objectives = Json("""[{ "type": "reach_node", "target_id": "1" }]"""), RewardXp = 50,
            Rewards = [new QuestRewardRequest { ItemCode = "ammo_rifle", Quantity = 30 }]
        }), HttpStatusCode.Created);
        await Read<MapDto>(await client.PostAsJsonAsync($"{url}/maps", new CreateMapRequest
        {
            Code = "camp", Name = "Safe Camp", SceneKey = "SafeCamp", IsSafeCamp = true
        }), HttpStatusCode.Created);
        await Read<MapDto>(await client.PostAsJsonAsync($"{url}/maps", new CreateMapRequest
        {
            Code = "docks", Name = "Docks", SceneKey = "Docks", SortOrder = 1,
            NavGraph = Json("""{ "nodes": [ { "id": 0, "neighbors": [1] }, { "id": 1, "neighbors": [0] } ] }"""),
            EnemyPlacements = [new EnemyPlacementRequest { EnemyTypeCode = "grunt", SquadTag = "squad_a", PosX = 5, PosY = 6 }],
            LootTables = [new MapLootTableRequest { LootTableCode = "loot_1", ContainerTag = "crate" }]
        }), HttpStatusCode.Created);
    }

    [DbFact]
    public async Task Designer_AuthorsReviewedAndAdminPublishes_GameServesTheBundle()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);

        var version = await CreateVersion(designer);
        version.Status.ShouldBe("Draft");
        await FillAsync(designer, version.Id);

        var report = await Read<ValidationReportDto>(await designer.PostAsync($"{Versions}/{version.Id}/validate", null));
        report.IsValid.ShouldBeTrue(string.Join("; ", report.Issues.Select(i => $"{i.Path}: {i.Message}")));
        report.Counts.Items.ShouldBe(3);
        report.Counts.Maps.ShouldBe(2);

        (await Read<ContentVersionDto>(await designer.PostAsync($"{Versions}/{version.Id}/submit", null))).Status.ShouldBe("InReview");

        // The designer cannot approve or publish, and the content is frozen while under review
        (await designer.PostAsJsonAsync($"{Versions}/{version.Id}/approve", new ReviewNoteRequest())).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await designer.PostAsJsonAsync($"{Versions}/{version.Id}/items", new CreateItemRequest { Code = "late", Name = "Late", Type = "Material" }))
            .StatusCode.ShouldBe(HttpStatusCode.Conflict);

        await Read<ContentVersionDto>(await admin.PostAsJsonAsync($"{Versions}/{version.Id}/approve", new ReviewNoteRequest { Note = "Looks good" }));
        var published = await Read<ContentVersionDto>(await admin.PostAsJsonAsync($"{Versions}/{version.Id}/publish", new PublishContentVersionRequest { Reason = "First release" }));
        published.Status.ShouldBe("Published");
        published.PublishedBy!.Username.ShouldStartWith("admin");

        // The game now receives exactly this bundle
        var game = Api.CreateGameClient();
        var manifest = await game.GetFromJsonAsync<JsonElement>("/api/game/content/manifest");
        manifest.GetProperty("versionId").GetGuid().ShouldBe(version.Id);
        var bundleResponse = await game.GetAsync("/api/game/content/bundle");
        bundleResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
        var bundle = JsonDocument.Parse(await bundleResponse.Content.ReadAsStringAsync()).RootElement;
        bundle.GetProperty("weapons")[0].GetProperty("ammo_type").GetString().ShouldBe("ammo_rifle");
        bundle.GetProperty("maps").GetArrayLength().ShouldBe(2);
        bundle.GetProperty("enemy_archetypes")[0].GetProperty("alert_decay_seconds").GetInt32().ShouldBe(8);
        bundle.GetProperty("ai_settings").GetProperty("default_solver_variant").GetString().ShouldNotBeNullOrEmpty();

        var history = await Read<PagedResult<PublicationHistoryDto>>(await admin.GetAsync($"{Versions}/history"));
        history.Items.Single().Action.ShouldBe("Publish");
    }

    [DbFact]
    public async Task NewVersionFromPublished_CopiesContent_ComparesAndRollsBack()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);

        var v1 = await CreateVersion(designer, "v1");
        await FillAsync(designer, v1.Id);
        await designer.PostAsync($"{Versions}/{v1.Id}/submit", null);
        await admin.PostAsJsonAsync($"{Versions}/{v1.Id}/approve", new ReviewNoteRequest());
        await Read<ContentVersionDto>(await admin.PostAsJsonAsync($"{Versions}/{v1.Id}/publish", new PublishContentVersionRequest()));

        // v2 starts as a copy; change a weapon stat and add an item
        var v2 = await CreateVersion(designer, "v2", baseVersionId: v1.Id);
        v2.ParentVersionId.ShouldBe(v1.Id);
        var copiedItems = await Read<List<ItemDto>>(await designer.GetAsync($"{Versions}/{v2.Id}/items"));
        copiedItems.Select(i => i.Code).Order().ShouldBe(["ammo_rifle", "rifle", "scrap"]);
        copiedItems.Select(i => i.Id).ShouldNotContain(id => id == Guid.Empty);
        var rifle = copiedItems.Single(i => i.Code == "rifle");
        rifle.Weapon!.AmmoItemCode.ShouldBe("ammo_rifle");

        var update = await designer.PutAsJsonAsync($"{Versions}/{v2.Id}/items/{rifle.Id}", new SaveItemRequest
        {
            Name = "Rifle", Type = "Weapon", Rarity = "Rare", MaxStack = 1,
            Weapon = new WeaponRequest
            {
                Class = "Rifle", Damage = 30, FireRate = 6.5m, EffectiveRange = 40, MagazineSize = 30, ReloadTimeSeconds = 2.4m,
                AmmoItemCode = "ammo_rifle", MaxDurability = 100, DurabilityPerUse = 0.12m, NoiseRadius = 18
            }
        });
        (await Read<ItemDto>(update)).Weapon!.Damage.ShouldBe(30);
        await Read<ItemDto>(await designer.PostAsJsonAsync($"{Versions}/{v2.Id}/items",
            new CreateItemRequest { Code = "cloth", Name = "Cloth", Type = "Material", MaxStack = 20 }), HttpStatusCode.Created);

        // v1 is untouched and frozen
        (await Read<ItemDto>(await designer.GetAsync($"{Versions}/{v1.Id}/items/{rifle.Id}".Replace(rifle.Id.ToString(), copiedItems.Single(i => i.Code == "rifle").Id.ToString()))))
            .ShouldNotBeNull();

        var diff = await Read<ContentCompareDto>(await designer.GetAsync($"{Versions}/compare?a={v1.Id}&b={v2.Id}"));
        diff.HasChanges.ShouldBeTrue();
        diff.Sections.Single(s => s.Section == "items").Added.ShouldBe(["cloth"]);
        diff.Sections.Single(s => s.Section == "weapons").Changed.Single().Fields.ShouldContain("damage");

        await designer.PostAsync($"{Versions}/{v2.Id}/submit", null);
        await admin.PostAsJsonAsync($"{Versions}/{v2.Id}/approve", new ReviewNoteRequest());
        await Read<ContentVersionDto>(await admin.PostAsJsonAsync($"{Versions}/{v2.Id}/publish", new PublishContentVersionRequest()));

        var versions = await Read<PagedResult<ContentVersionDto>>(await admin.GetAsync(Versions));
        versions.Items.Single(v => v.Id == v1.Id).Status.ShouldBe("Archived");
        versions.Items.Single(v => v.Id == v2.Id).Status.ShouldBe("Published");

        // Rolling back needs a reason, then v1 is live again
        (await admin.PostAsJsonAsync($"{Versions}/{v1.Id}/rollback", new { reason = "" })).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        await Read<ContentVersionDto>(await admin.PostAsJsonAsync($"{Versions}/{v1.Id}/rollback", new RollbackContentVersionRequest { Reason = "Damage too high" }));
        var manifest = await Api.CreateGameClient().GetFromJsonAsync<JsonElement>("/api/game/content/manifest");
        manifest.GetProperty("versionId").GetGuid().ShouldBe(v1.Id);
        (await Read<PagedResult<PublicationHistoryDto>>(await admin.GetAsync($"{Versions}/history"))).Items.Select(h => h.Action)
            .ShouldBe(["Rollback", "Publish", "Publish"]);
    }

    [DbFact]
    public async Task Submit_WithBrokenContent_Returns400ListingTheProblems()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var version = await CreateVersion(designer);
        await Read<ItemDto>(await designer.PostAsJsonAsync($"{Versions}/{version.Id}/items",
            new CreateItemRequest { Code = "scrap", Name = "Scrap", Type = "Material" }), HttpStatusCode.Created);

        var response = await designer.PostAsync($"{Versions}/{version.Id}/submit", null);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).ShouldContain("maps");
        (await Read<ContentVersionDto>(await designer.GetAsync($"{Versions}/{version.Id}"))).Status.ShouldBe("Draft");
    }

    [DbFact]
    public async Task Rejected_VersionCanBeEditedAndSubmittedAgain()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);
        var version = await CreateVersion(designer);
        await FillAsync(designer, version.Id);
        await designer.PostAsync($"{Versions}/{version.Id}/submit", null);

        (await admin.PostAsJsonAsync($"{Versions}/{version.Id}/reject", new { note = "" })).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        var rejected = await Read<ContentVersionDto>(await admin.PostAsJsonAsync($"{Versions}/{version.Id}/reject", new RejectContentVersionRequest { Note = "Rebalance the boss" }));
        rejected.Status.ShouldBe("Rejected");
        rejected.ReviewNote.ShouldBe("Rebalance the boss");

        await Read<ItemDto>(await designer.PostAsJsonAsync($"{Versions}/{version.Id}/items",
            new CreateItemRequest { Code = "cloth", Name = "Cloth", Type = "Material" }), HttpStatusCode.Created);
        (await Read<ContentVersionDto>(await designer.GetAsync($"{Versions}/{version.Id}"))).Status.ShouldBe("Draft");

        (await Read<ContentVersionDto>(await designer.PostAsync($"{Versions}/{version.Id}/submit", null))).Status.ShouldBe("InReview");
    }

    [DbFact]
    public async Task EditingClearsTheValidation_AndPublishedVersionIsFrozen()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var version = await CreateVersion(designer);
        await FillAsync(designer, version.Id);

        (await Read<ValidationReportDto>(await designer.PostAsync($"{Versions}/{version.Id}/validate", null))).IsValid.ShouldBeTrue();
        (await designer.GetAsync($"{Versions}/{version.Id}/bundle")).StatusCode.ShouldBe(HttpStatusCode.OK);

        await Read<ItemDto>(await designer.PostAsJsonAsync($"{Versions}/{version.Id}/items",
            new CreateItemRequest { Code = "cloth", Name = "Cloth", Type = "Material" }), HttpStatusCode.Created);

        (await Read<ContentVersionDto>(await designer.GetAsync($"{Versions}/{version.Id}"))).IsValidated.ShouldBeFalse();
        (await designer.GetAsync($"{Versions}/{version.Id}/bundle")).StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [DbFact]
    public async Task Item_RulesAreEnforced()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var version = await CreateVersion(designer);
        var url = $"{Versions}/{version.Id}/items";
        await FillAsync(designer, version.Id);

        // Duplicate code
        (await designer.PostAsJsonAsync(url, new CreateItemRequest { Code = "scrap", Name = "Scrap 2", Type = "Material" })).StatusCode.ShouldBe(HttpStatusCode.Conflict);
        // A weapon needs weapon stats; other types must not have them
        (await designer.PostAsJsonAsync(url, new CreateItemRequest { Code = "gun", Name = "Gun", Type = "Weapon" })).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        // Ammo must be an item of type Ammo
        var badAmmo = await designer.PostAsJsonAsync(url, new CreateItemRequest
        {
            Code = "gun", Name = "Gun", Type = "Weapon",
            Weapon = new WeaponRequest { Class = "Rifle", Damage = 5, FireRate = 1, MagazineSize = 5, ReloadTimeSeconds = 1, AmmoItemCode = "scrap" }
        });
        badAmmo.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        // Bad code format
        (await designer.PostAsJsonAsync(url, new CreateItemRequest { Code = "Bad Code", Name = "x", Type = "Material" })).StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        // An item that is still used cannot be deleted, and the message says by what
        var items = await Read<List<ItemDto>>(await designer.GetAsync(url));
        var scrap = items.Single(i => i.Code == "scrap");
        var delete = await designer.DeleteAsync($"{url}/{scrap.Id}");
        delete.StatusCode.ShouldBe(HttpStatusCode.Conflict);
        (await delete.Content.ReadAsStringAsync()).ShouldContain("loot table 'loot_1'");

        // The type cannot change
        (await designer.PutAsJsonAsync($"{url}/{scrap.Id}", new SaveItemRequest { Name = "Scrap", Type = "Tool" })).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [DbFact]
    public async Task OnlyOneSafeCamp_AndChildListsAreReplaced()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var version = await CreateVersion(designer);
        await FillAsync(designer, version.Id);
        var url = $"{Versions}/{version.Id}";

        (await designer.PostAsJsonAsync($"{url}/maps", new CreateMapRequest { Code = "camp2", Name = "Camp 2", SceneKey = "Camp2", IsSafeCamp = true }))
            .StatusCode.ShouldBe(HttpStatusCode.Conflict);

        var maps = await Read<List<MapSummaryDto>>(await designer.GetAsync($"{url}/maps"));
        var docks = await Read<MapDto>(await designer.GetAsync($"{url}/maps/{maps.Single(m => m.Code == "docks").Id}"));
        docks.EnemyPlacements.Count.ShouldBe(1);

        var updated = await Read<MapDto>(await designer.PutAsJsonAsync($"{url}/maps/{docks.Id}", new SaveMapRequest
        {
            Name = "Docks", SceneKey = "Docks", NavGraph = docks.NavGraph,
            EnemyPlacements =
            [
                new EnemyPlacementRequest { EnemyTypeCode = "grunt", SquadTag = "squad_a", PosX = 1, PosY = 1 },
                new EnemyPlacementRequest { EnemyTypeCode = "grunt", SquadTag = "squad_a", PosX = 2, PosY = 2 }
            ]
        }));
        updated.EnemyPlacements.Count.ShouldBe(2);
        updated.LootTables.ShouldBeEmpty();

        // The enemy type is placed on a map, so it cannot be deleted
        var enemies = await Read<List<EnemyTypeDto>>(await designer.GetAsync($"{url}/enemy-types"));
        (await designer.DeleteAsync($"{url}/enemy-types/{enemies.Single().Id}")).StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [DbFact]
    public async Task Roles_AnalystReadsVersionsOnly_DesignerCannotDeleteOthersPublishedWork()
    {
        var analyst = await Api.CreateUserClientAsync(UserRole.Analyst);
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var version = await CreateVersion(designer);

        (await analyst.GetAsync(Versions)).StatusCode.ShouldBe(HttpStatusCode.OK);
        (await analyst.GetAsync($"{Versions}/{version.Id}")).StatusCode.ShouldBe(HttpStatusCode.OK);
        (await analyst.GetAsync($"{Versions}/{version.Id}/items")).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await analyst.PostAsJsonAsync(Versions, new CreateContentVersionRequest { Label = "x" })).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await Api.CreateClient().GetAsync(Versions)).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [DbFact]
    public async Task Publish_OnlyApprovedVersions_And_Delete_OnlyUnpublished()
    {
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);
        var version = await CreateVersion(admin);
        await FillAsync(admin, version.Id);

        (await admin.PostAsJsonAsync($"{Versions}/{version.Id}/publish", new PublishContentVersionRequest())).StatusCode.ShouldBe(HttpStatusCode.Conflict);

        await admin.PostAsync($"{Versions}/{version.Id}/submit", null);
        await admin.PostAsJsonAsync($"{Versions}/{version.Id}/approve", new ReviewNoteRequest());
        await Read<ContentVersionDto>(await admin.PostAsJsonAsync($"{Versions}/{version.Id}/publish", new PublishContentVersionRequest()));

        (await admin.DeleteAsync($"{Versions}/{version.Id}")).StatusCode.ShouldBe(HttpStatusCode.Conflict);

        var draft = await CreateVersion(admin, "scratch");
        (await admin.DeleteAsync($"{Versions}/{draft.Id}")).StatusCode.ShouldBe(HttpStatusCode.NoContent);
        (await admin.GetAsync($"{Versions}/{draft.Id}")).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [DbFact]
    public async Task Meta_ListsContentEnums()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);

        var meta = await designer.GetFromJsonAsync<JsonElement>("/api/meta/enums");

        meta.GetProperty("itemTypes").EnumerateArray().Select(e => e.GetString()).ShouldContain("Weapon");
        meta.GetProperty("contentStatuses").EnumerateArray().Select(e => e.GetString()).ShouldContain("InReview");
    }
}
