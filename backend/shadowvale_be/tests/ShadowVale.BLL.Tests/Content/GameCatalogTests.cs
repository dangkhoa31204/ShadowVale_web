using System.Text.Json.Nodes;
using NSubstitute;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Repositories.Interfaces;
using Shouldly;

namespace ShadowVale.BLL.Tests.Content;

public class GameCatalogTests
{
    [Fact]
    public void EmbeddedSnapshot_ContainsRuntimeTradeAndBothMissionMaps()
    {
        var catalog = GameCatalogService.GetSnapshot();
        catalog["trade"]!["offers"]!.AsArray().Count.ShouldBeGreaterThan(0);
        catalog["quests"]!.AsArray().Select(q => q!["mapCode"]!.GetValue<string>()).ShouldContain("map02");
        catalog["databaseAudit"]!.AsArray().Count.ShouldBe(23);
    }

    [Fact]
    public void Comparison_ReportsChangedMissingAndPublishedOnlyRows_WithoutComparingUnexportedFields()
    {
        var local = JsonNode.Parse("""{"weapons":[{"item_code":"ak","damage":24},{"item_code":"m16","damage":22}]}""")!.AsObject();
        var remote = JsonNode.Parse("""{"weapons":[{"item_code":"ak","damage":30,"name":"AK47"},{"item_code":"mosin","damage":70}]}""")!.AsObject();
        var diff = GameCatalogService.Compare(local, remote);
        diff.Count.ShouldBe(3);
        diff.Select(d => d!["kind"]!.GetValue<string>()).ShouldBe(["changed", "missing_in_published", "published_only"]);
        diff[0]!["field"]!.GetValue<string>().ShouldBe("damage");
    }

    [Fact]
    public void Comparison_TreatsNumericFormattingEqually_AndDoesNotModifySources()
    {
        var local = JsonNode.Parse("""{"items":[{"code":"ammo","max_stack":99}]}""")!.AsObject();
        var remote = JsonNode.Parse("""{"items":[{"code":"ammo","max_stack":99.0,"name":"Ammo"}]}""")!.AsObject();
        GameCatalogService.Compare(local, remote).Count.ShouldBe(0);
        local["items"]![0]!["max_stack"]!.GetValue<int>().ShouldBe(99);
    }

    [Fact]
    public async Task NoPublication_IsAnExplicitState()
    {
        var repo = Substitute.For<IGameContentRepository>();
        var result = await new GameCatalogService(repo).ComparePublishedAsync();
        result["status"]!.GetValue<string>().ShouldBe("nothing_published");
        await repo.DidNotReceive().GetPublishedBundleAsync(Arg.Any<CancellationToken>());
    }
}
