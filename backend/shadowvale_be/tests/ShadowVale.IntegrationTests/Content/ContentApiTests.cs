using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.DAL.Entities;
using ShadowVale.IntegrationTests.Infrastructure;
using Shouldly;

namespace ShadowVale.IntegrationTests.Content;

// Content rows are authored through the per-version CRUD endpoints; the version itself and its
// validate / review / publish workflow go through /api/content-versions, which needs the current revision on every write
public class ContentApiTests(ApiFixture api) : IntegrationTest(api)
{
    private const string Versions = "/api/content-versions";

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static async Task<T> Read<T>(HttpResponseMessage response, HttpStatusCode expected = HttpStatusCode.OK)
    {
        response.StatusCode.ShouldBe(expected, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<T>(new JsonSerializerOptions(JsonSerializerDefaults.Web)))!;
    }

    private static async Task<ContentVersionDto> CreateVersion(HttpClient client, string label = "v1", Guid? parentVersionId = null) =>
        await Read<ContentVersionDto>(await client.PostAsJsonAsync(Versions,
            new CreateContentVersionRequest { Label = label, ParentVersionId = parentVersionId }), HttpStatusCode.Created);

    private static async Task<ContentVersionDto> GetVersion(HttpClient client, Guid id) =>
        (await Read<ContentVersionDetailsDto>(await client.GetAsync($"{Versions}/{id}"))).Version;

    // Every workflow call sends the revision the caller last saw
    private static async Task<HttpResponseMessage> Act(HttpClient client, Guid id, string action, object? extra = null)
    {
        var body = new Dictionary<string, object?> { ["revision"] = (await GetVersion(client, id)).Revision };
        foreach (var property in extra?.GetType().GetProperties() ?? [])
            body[property.Name] = property.GetValue(extra);
        return await client.PostAsJsonAsync($"{Versions}/{id}/{action}", body);
    }

    private static async Task<ContentVersionDto> ValidateAndSubmit(HttpClient client, Guid id)
    {
        var report = await Read<ContentValidationResultDto>(await Act(client, id, "validate"));
        report.IsValid.ShouldBeTrue(string.Join("; ", report.Errors.Select(e => $"{e.Path}: {e.Message}")));
        return await Read<ContentVersionDto>(await Act(client, id, "submit"));
    }

    private static async Task<ContentVersionDto> ApproveAndPublish(HttpClient admin, Guid id)
    {
        await Read<ContentVersionDto>(await Act(admin, id, "approve", new { reviewNote = "Looks good" }));
        return await Read<ContentVersionDto>(await Act(admin, id, "publish", new { reason = "Release" }));
    }

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

        (await ValidateAndSubmit(designer, version.Id)).Status.ShouldBe("InReview");

        // The designer cannot approve, and the content is frozen while under review
        (await Act(designer, version.Id, "approve")).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await designer.PostAsJsonAsync($"{Versions}/{version.Id}/items", new CreateItemRequest { Code = "late", Name = "Late", Type = "Material" }))
            .StatusCode.ShouldBe(HttpStatusCode.Conflict);

        var published = await ApproveAndPublish(admin, version.Id);
        published.Status.ShouldBe("Published");
        published.PublishedById.ShouldNotBeNull();

        // The game now receives this version
        var game = Api.CreateGameClient();
        var manifest = await game.GetFromJsonAsync<JsonElement>("/api/game/content/manifest");
        manifest.GetProperty("versionId").GetGuid().ShouldBe(version.Id);
        var bundleResponse = await game.GetAsync("/api/game/content/bundle");
        bundleResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
        var bundle = JsonDocument.Parse(await bundleResponse.Content.ReadAsStringAsync()).RootElement;
        bundle.GetProperty("weapons")[0].GetProperty("ammo_item_code").GetString().ShouldBe("ammo_rifle");
        bundle.GetProperty("maps").GetArrayLength().ShouldBe(2);

        var history = await Read<PagedResult<ContentPublicationDto>>(await admin.GetAsync("/api/content-publications"));
        history.Items.Single().ContentVersionId.ShouldBe(version.Id);
    }

    [DbFact]
    public async Task NewVersionFromParent_CopiesContent_AndPublishingItArchivesTheOldOne()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);

        var v1 = await CreateVersion(designer, "v1");
        await FillAsync(designer, v1.Id);
        await ValidateAndSubmit(designer, v1.Id);
        await ApproveAndPublish(admin, v1.Id);

        // v2 starts as a copy; change a weapon stat and add an item
        var v2 = await CreateVersion(designer, "v2", parentVersionId: v1.Id);
        v2.ParentVersionId.ShouldBe(v1.Id);
        var originalItems = await Read<List<ItemDto>>(await designer.GetAsync($"{Versions}/{v1.Id}/items"));
        var copiedItems = await Read<List<ItemDto>>(await designer.GetAsync($"{Versions}/{v2.Id}/items"));
        copiedItems.Select(i => i.Code).Order().ShouldBe(["ammo_rifle", "rifle", "scrap"]);
        copiedItems.Select(i => i.Id).ShouldNotContain(id => originalItems.Any(o => o.Id == id));
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

        // v1 is untouched
        originalItems.Single(i => i.Code == "rifle").Weapon!.Damage.ShouldBe(24);

        var diff = await Read<ContentComparisonDto>(await designer.GetAsync($"{Versions}/{v1.Id}/compare?targetId={v2.Id}"));
        diff.Differences.ShouldNotBeEmpty();

        await ValidateAndSubmit(designer, v2.Id);
        await ApproveAndPublish(admin, v2.Id);

        (await GetVersion(admin, v1.Id)).Status.ShouldBe("Archived");
        (await GetVersion(admin, v2.Id)).Status.ShouldBe("Published");
        var manifest = await Api.CreateGameClient().GetFromJsonAsync<JsonElement>("/api/game/content/manifest");
        manifest.GetProperty("versionId").GetGuid().ShouldBe(v2.Id);
    }

    [DbFact]
    public async Task Submit_WithBrokenContent_IsRefused_AndValidationListsTheProblems()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var version = await CreateVersion(designer);
        await Read<ItemDto>(await designer.PostAsJsonAsync($"{Versions}/{version.Id}/items",
            new CreateItemRequest { Code = "scrap", Name = "Scrap", Type = "Material" }), HttpStatusCode.Created);

        // No Safe Camp yet
        var report = await Read<ContentValidationResultDto>(await Act(designer, version.Id, "validate"));
        report.IsValid.ShouldBeFalse();
        report.Errors.ShouldNotBeEmpty();

        (await Act(designer, version.Id, "submit")).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await GetVersion(designer, version.Id)).Status.ShouldBe("Draft");
    }

    [DbFact]
    public async Task Rejected_VersionCanBeEditedAndSubmittedAgain()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);
        var version = await CreateVersion(designer);
        await FillAsync(designer, version.Id);
        await ValidateAndSubmit(designer, version.Id);

        (await Act(admin, version.Id, "reject")).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        var rejected = await Read<ContentVersionDto>(await Act(admin, version.Id, "reject", new { reviewNote = "Rebalance the boss" }));
        rejected.Status.ShouldBe("Rejected");
        rejected.ReviewNote.ShouldBe("Rebalance the boss");

        // The first edit reopens it as a Draft
        await Read<ItemDto>(await designer.PostAsJsonAsync($"{Versions}/{version.Id}/items",
            new CreateItemRequest { Code = "cloth", Name = "Cloth", Type = "Material" }), HttpStatusCode.Created);
        (await GetVersion(designer, version.Id)).Status.ShouldBe("Draft");

        (await ValidateAndSubmit(designer, version.Id)).Status.ShouldBe("InReview");
    }

    [DbFact]
    public async Task EditingContent_MovesTheRevisionOn_AndClearsTheValidation()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var version = await CreateVersion(designer);
        await FillAsync(designer, version.Id);

        (await Read<ContentValidationResultDto>(await Act(designer, version.Id, "validate"))).IsValid.ShouldBeTrue();
        var validated = await GetVersion(designer, version.Id);
        validated.ValidatedAt.ShouldNotBeNull();
        validated.BundleChecksum.ShouldNotBeNull();

        await Read<ItemDto>(await designer.PostAsJsonAsync($"{Versions}/{version.Id}/items",
            new CreateItemRequest { Code = "cloth", Name = "Cloth", Type = "Material" }), HttpStatusCode.Created);

        var edited = await GetVersion(designer, version.Id);
        edited.Revision.ShouldBeGreaterThan(validated.Revision);
        edited.ValidatedAt.ShouldBeNull();
        edited.BundleChecksum.ShouldBeNull();

        // A write that still carries the old revision is refused
        (await designer.PostAsJsonAsync($"{Versions}/{version.Id}/submit", new { revision = validated.Revision }))
            .StatusCode.ShouldBe(HttpStatusCode.Conflict);
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
    public async Task Roles_AnalystCannotReachContent_AndAnonymousIsRejected()
    {
        var analyst = await Api.CreateUserClientAsync(UserRole.Analyst);
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var version = await CreateVersion(designer);

        (await analyst.GetAsync(Versions)).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await analyst.GetAsync($"{Versions}/{version.Id}/items")).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await analyst.PostAsJsonAsync(Versions, new CreateContentVersionRequest { Label = "x" })).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await designer.GetAsync("/api/content-publications")).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await Api.CreateClient().GetAsync(Versions)).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [DbFact]
    public async Task Publish_OnlyApprovedVersions_And_Delete_OnlyDrafts()
    {
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);
        var version = await CreateVersion(admin);
        await FillAsync(admin, version.Id);

        (await Act(admin, version.Id, "publish", new { reason = "Too early" })).StatusCode.ShouldBe(HttpStatusCode.Conflict);

        await ValidateAndSubmit(admin, version.Id);
        await ApproveAndPublish(admin, version.Id);

        (await Delete(admin, version.Id)).StatusCode.ShouldBe(HttpStatusCode.Conflict);

        // Deleting a validated draft archives it; its content is kept
        var draft = await CreateVersion(admin, "scratch");
        await FillAsync(admin, draft.Id);
        (await Read<ContentValidationResultDto>(await Act(admin, draft.Id, "validate"))).IsValid.ShouldBeTrue();
        (await Delete(admin, draft.Id)).StatusCode.ShouldBe(HttpStatusCode.NoContent);
        (await GetVersion(admin, draft.Id)).Status.ShouldBe("Archived");
    }

    private static async Task<HttpResponseMessage> Delete(HttpClient client, Guid id) =>
        await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"{Versions}/{id}")
        {
            Content = JsonContent.Create(new { revision = (await GetVersion(client, id)).Revision })
        });

    [DbFact]
    public async Task Meta_ListsContentEnums()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);

        var meta = await designer.GetFromJsonAsync<JsonElement>("/api/meta/enums");

        meta.GetProperty("itemTypes").EnumerateArray().Select(e => e.GetString()).ShouldContain("Weapon");
        meta.GetProperty("contentStatuses").EnumerateArray().Select(e => e.GetString()).ShouldContain("InReview");
    }
}
