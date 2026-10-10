using System.Text.Json.Nodes;
using ShadowVale.BLL.Services;
using Shouldly;

namespace ShadowVale.BLL.Tests.Content;

public class ContentBundleComparisonTests
{
    [Fact]
    public void Compare_matches_codes_instead_of_array_order()
    {
        var before = JsonNode.Parse("""{"items":[{"code":"a","weight":1},{"code":"b","weight":2}]}""")!.AsObject();
        var after = JsonNode.Parse("""{"items":[{"code":"b","weight":2},{"code":"a","weight":3}]}""")!.AsObject();
        var changes = ContentBundleComparison.Compare(before, after);
        changes.Count.ShouldBe(1);
        changes[0].Path.ShouldEndWith("/weight");
        changes[0].Before!.Value.GetInt32().ShouldBe(1);
        changes[0].After!.Value.GetInt32().ShouldBe(3);
    }

    [Fact]
    public void Clone_metadata_and_placement_ids_do_not_create_false_changes()
    {
        var before = JsonNode.Parse("""{"version_no":1,"content_version_id":"a","enemy_placements":[{"id":"a","pos_x":1},{"id":"b","pos_x":2}]}""")!.AsObject();
        var after = JsonNode.Parse("""{"version_no":2,"content_version_id":"b","enemy_placements":[{"id":"c","pos_x":2},{"id":"d","pos_x":1}]}""")!.AsObject();
        ContentBundleComparison.Compare(before, after).ShouldBeEmpty();
        after["enemy_placements"]!.AsArray().Add(after["enemy_placements"]![0]!.DeepClone());
        ContentBundleComparison.Compare(before, after).Count.ShouldBe(1);
    }
}
