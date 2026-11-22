using System.Text.Json.Nodes;
using ShadowVale.BLL.Services;
using Shouldly;

namespace ShadowVale.BLL.Tests.Content;
public class GameRulesValidationTests
{
    private static JsonObject Bundle() => GameCatalogService.GetSnapshot()["authoringBundle"]!.DeepClone().AsObject();
    private static JsonObject Rules(JsonObject b) => b["maps"]!.AsArray().Single(m => m!["code"]!.ToString() == "map01")!["layout"]!["game_rules"]!.AsObject();
    [Fact]
    public void ImportBundle_PassesFullBusinessValidation() => new ContentBundleValidator().Validate(Bundle()).ShouldBeEmpty();
    [Fact]
    public void TradeReferencesAndAllZeroOddsCannotBePublished()
    {
        var b=Bundle();var rules=Rules(b);
        rules["trade_offers"]![0]!["gun"]="unknown_gun";
        rules["tier_odds"]=JsonNode.Parse("[0,0,0,0]");
        var errors=new ContentBundleValidator().Validate(b);
        errors.ShouldContain(e=>e.Path.EndsWith("/trade_offers"));
        errors.ShouldContain(e=>e.Path.EndsWith("/tier_odds"));
    }
    [Fact]
    public void UnknownFieldRecipeAndTurnInCreditAreRejected()
    {
        var b=Bundle();var rules=Rules(b);
        rules["field_crafting"]!["missing_recipe"]=JsonNode.Parse("{\"seconds\":3,\"max_batch\":1}");
        rules["logistics"]!["materialTrade"]![0]!["id"]="missing_item";
        var errors=new ContentBundleValidator().Validate(b);
        errors.ShouldContain(e=>e.Path.EndsWith("/field_crafting"));
        errors.ShouldContain(e=>e.Path.EndsWith("/materialTrade"));
    }
    [Fact]
    public void InvalidSalvageCannotReachTheUnityMetadataConsumer()
    {
        var b=Bundle();
        b["items"]![0]!["stats"]=JsonNode.Parse("{\"found_min\":0.9,\"found_max\":0.2,\"salvage\":[{\"item\":\"missing_item\",\"min\":1,\"max\":2}]}");
        var errors=new ContentBundleValidator().Validate(b);
        errors.ShouldContain(e=>e.Path.StartsWith("/items/0/stats"));
    }
}
