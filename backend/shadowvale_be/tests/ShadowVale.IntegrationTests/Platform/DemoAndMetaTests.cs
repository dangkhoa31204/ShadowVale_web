using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ShadowVale.BLL.DTOs.Analytics;
using ShadowVale.BLL.DTOs.Meta;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Entities;
using ShadowVale.IntegrationTests.Infrastructure;
using Shouldly;

namespace ShadowVale.IntegrationTests.Platform;

public class DemoAndMetaTests(ApiFixture api) : IntegrationTest(api)
{
    private async Task SeedDemoAsync()
    {
        await using var scope = Api.Factory.Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<IDemoDataSeeder>().SeedAsync();
    }

    [DbFact]
    public async Task DemoSeeder_CreatesMarkedDataThatFeedsEveryDashboard()
    {
        await Api.SeedSolverConfigurationsAsync();
        var analyst = await Api.CreateUserClientAsync(UserRole.Analyst);

        await SeedDemoAsync();
        await SeedDemoAsync(); // second run replaces instead of adding

        var sessions = await Api.WithDbAsync(db => db.GameSessions.ToListAsync());
        sessions.Count.ShouldBe(300);
        sessions.ShouldAllBe(s => s.ClientVersion == DemoDataSeeder.Marker);
        sessions.Select(s => s.Source).Distinct().Count().ShouldBe(2);

        (await analyst.GetFromJsonAsync<OverviewDto>("/api/analytics/overview"))!.Sessions.ShouldBeGreaterThan(0);
        (await analyst.GetFromJsonAsync<List<AiComparisonRowDto>>("/api/analytics/ai/comparison?source=replay"))!.ShouldNotBeEmpty();
        (await analyst.GetFromJsonAsync<HeatmapDto>("/api/analytics/heatmap?mapCode=map01_docks"))!.Cells.ShouldNotBeEmpty();
        // The demo version is published, so the game API serves its bundle
        (await Api.CreateGameClient().GetAsync("/api/game/content/bundle")).StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [DbFact]
    public async Task DemoSeeder_WithRealSessions_DoesNothing()
    {
        await Api.CreateUserClientAsync(UserRole.Admin);
        await Api.CreateGameClient().PutAsJsonAsync($"/api/game/sessions/{Guid.NewGuid()}", GameData.Upload(Guid.NewGuid()));

        await SeedDemoAsync();

        (await Api.WithDbAsync(db => db.GameSessions.CountAsync())).ShouldBe(1);
    }

    [DbFact]
    public async Task Enums_ListValuesForFilters()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);

        var enums = (await designer.GetFromJsonAsync<EnumsDto>("/api/meta/enums"))!;

        enums.SolverAlgorithms.ShouldContain("Sqa");
        enums.SessionSources.ShouldBe(["human", "replay"]);
        enums.EncounterOutcomes.ShouldContain("PlayerCaptured");
        (await Api.CreateClient().GetAsync("/api/meta/enums")).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }
}
