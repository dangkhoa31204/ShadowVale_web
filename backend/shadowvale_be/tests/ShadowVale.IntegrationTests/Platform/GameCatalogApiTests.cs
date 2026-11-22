using System.Net;
using System.Text.Json.Nodes;
using ShadowVale.DAL.Entities;
using ShadowVale.IntegrationTests.Infrastructure;
using Shouldly;

namespace ShadowVale.IntegrationTests.Platform;

public class GameCatalogApiTests(ApiFixture api) : IntegrationTest(api)
{
    [DbFact]
    public async Task Snapshot_RequiresAuthentication()
    {
        (await Api.CreateClient().GetAsync("/api/game-catalog")).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [DbFact]
    public async Task Designer_CanReadSnapshotAndComparison()
    {
        var client = await Api.CreateUserClientAsync(UserRole.Designer);
        var response = await client.GetAsync("/api/game-catalog");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var snapshot = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        snapshot["schemaVersion"]!.GetValue<int>().ShouldBe(1);
        var comparison = await client.GetAsync("/api/game-catalog/comparison");
        comparison.StatusCode.ShouldBe(HttpStatusCode.OK);
        JsonNode.Parse(await comparison.Content.ReadAsStringAsync())!["status"]!.GetValue<string>().ShouldBe("nothing_published");
    }

    [DbTheory]
    [InlineData(UserRole.Admin)]
    [InlineData(UserRole.Analyst)]
    public async Task OtherRoles_CannotReadUnityCatalogEvenWithDirectApiCalls(UserRole role)
    {
        var client = await Api.CreateUserClientAsync(role);
        foreach (var path in new[] { "/api/game-catalog", "/api/game-catalog/comparison" })
            (await client.GetAsync(path)).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }
}
