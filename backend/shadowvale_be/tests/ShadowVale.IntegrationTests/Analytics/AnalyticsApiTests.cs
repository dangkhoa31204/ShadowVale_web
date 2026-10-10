using System.Net;
using System.Net.Http.Json;
using System.Text;
using ShadowVale.BLL.DTOs.Analytics;
using ShadowVale.Contracts.Telemetry;
using ShadowVale.DAL.Entities;
using ShadowVale.IntegrationTests.Infrastructure;
using Shouldly;

namespace ShadowVale.IntegrationTests.Analytics;

// Small hand-made data set; every expected number below is computed by hand from it
public class AnalyticsApiTests(ApiFixture api) : IntegrationTest(api)
{
    private static readonly DateTimeOffset T = GameData.Start;

    private ContentVersion _versionA = null!;
    private ContentVersion _versionB = null!;
    private HttpClient _analyst = null!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        if (TestDatabase.ShouldSkip)
            return;

        await Api.SeedSolverConfigurationsAsync();
        _versionA = await GameData.PublishVersionAsync(Api, """{"v": "a"}""", "A");
        _versionB = await Api.WithDbAsync(async db =>
        {
            var b = new ContentVersion { Label = "B", AuthoredById = _versionA.AuthoredById };
            db.ContentVersions.Add(b);
            await db.SaveChangesAsync();
            return b;
        });
        _analyst = await Api.CreateUserClientAsync(UserRole.Analyst);
        var game = Api.CreateGameClient();

        // R1: replay, greedy. Escaped (60 s), captured, aborted; two re-plans (10 ms and 30 ms), one of them a fallback
        var r1 = Guid.NewGuid();
        var install = Guid.NewGuid();
        var start1 = GameData.StartRequest(r1, install, "replay", "greedy");
        start1.ClientVersion = "=HYPERLINK(1)"; // for the CSV formula-injection check
        await game.PostAsJsonAsync("/api/game/sessions", start1);
        var upload1 = Upload(install, "replay",
            [Encounter(0, "PlayerEscaped", 60), Encounter(1, "PlayerCaptured", 5), Encounter(2, "Aborted", 5)]);
        upload1.CoordinationResults = [Result("greedy", 10, 0.4, fallback: false), Result("greedy", 30, 0.6, fallback: true)];
        (await game.PutAsJsonAsync($"/api/game/sessions/{r1}", upload1)).EnsureSuccessStatusCode();

        // R2: replay, sqa. Two captures and no re-plan at all
        var r2 = Guid.NewGuid();
        await game.PostAsJsonAsync("/api/game/sessions", GameData.StartRequest(r2, install, "replay", "sqa"));
        (await game.PutAsJsonAsync($"/api/game/sessions/{r2}",
            Upload(install, "replay", [Encounter(0, "PlayerCaptured", 5), Encounter(1, "PlayerCaptured", 7)]))).EnsureSuccessStatusCode();

        // H1: human on version A (no start call, so no solver). Deaths and a sighting for the heat map, objectives 0 and 1, mission won.
        var h1 = Upload(Guid.NewGuid(), "human", []);
        h1.ContentVersionId = _versionA.Id;
        h1.Stats!.ShotsByWeapon = new() { ["rifle"] = 10 };
        h1.Stats.KillsByWeapon = new() { ["rifle"] = 2 };
        h1.Stats.Takedowns = 3;
        h1.Stats.WeaponKills = 1;
        h1.Events =
        [
            Event(TelemetryEventTypes.PlayerDeath, 12, 7),
            Event(TelemetryEventTypes.PlayerDeath, 13, 8),
            Event(TelemetryEventTypes.PlayerSpotted, -1, 2),
            Event(TelemetryEventTypes.ShotFired, 12, 7),
            Event(TelemetryEventTypes.ObjectiveCompleted, payload: new() { ["index"] = 0 }),
            Event(TelemetryEventTypes.ObjectiveCompleted, payload: new() { ["index"] = 1 }),
            Event(TelemetryEventTypes.MissionResult, payload: new() { ["result"] = "completed" })
        ];
        (await game.PutAsJsonAsync($"/api/game/sessions/{Guid.NewGuid()}", h1)).EnsureSuccessStatusCode();
    }

    [DbFact]
    public async Task Overview_DefaultsToHumanAndNeverMixesSources()
    {
        var human = (await _analyst.GetFromJsonAsync<OverviewDto>("/api/analytics/overview"))!;
        var replay = (await _analyst.GetFromJsonAsync<OverviewDto>("/api/analytics/overview?source=replay"))!;

        human.Sessions.ShouldBe(1);
        human.AvgDurationSeconds.ShouldBe(900);
        human.Outcomes.Single().Share.ShouldBe(1);
        replay.Sessions.ShouldBe(2);
        replay.Players.ShouldBe(1);
    }

    [DbFact]
    public async Task Heatmap_CountsDefaultEventTypesPerCell()
    {
        var heatmap = (await _analyst.GetFromJsonAsync<HeatmapDto>("/api/analytics/heatmap?mapCode=map01&cellSize=5"))!;

        heatmap.Cells.Select(c => (c.X, c.Y, c.Count)).ShouldBe([(-5.0, 0.0, 1L), (10.0, 5.0, 2L)]);
        (await _analyst.GetAsync("/api/analytics/heatmap")).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [DbFact]
    public async Task Funnel_FollowsObjectivesToMissionResult()
    {
        var funnel = (await _analyst.GetFromJsonAsync<FunnelDto>("/api/analytics/funnel"))!;

        funnel.SessionsStarted.ShouldBe(1);
        funnel.Objectives.Select(o => (o.ObjectiveIndex, o.Sessions)).ShouldBe([(0, 1L), (1, 1L)]);
        funnel.MissionsCompleted.ShouldBe(1);
    }

    [DbFact]
    public async Task WeaponsAndPlaystyle_ComeFromSessionStats()
    {
        var weapons = (await _analyst.GetFromJsonAsync<WeaponUsageDto>("/api/analytics/weapons"))!;
        var playstyle = (await _analyst.GetFromJsonAsync<PlaystyleDto>("/api/analytics/playstyle"))!;

        var rifle = weapons.Weapons.Single();
        (rifle.Weapon, rifle.Shots, rifle.Kills, rifle.KillsPerShot, rifle.SessionShare).ShouldBe(("rifle", 10L, 2L, 0.2, 1.0));
        playstyle.AvgStealthRatio.ShouldBe(0.75);
        playstyle.StealthRatioHistogram[7].Sessions.ShouldBe(1);
        playstyle.StealthRatioHistogram.Sum(b => b.Sessions).ShouldBe(1);
    }

    [DbFact]
    public async Task CompareVersions_SplitsByContentVersion()
    {
        var comparison = (await _analyst.GetFromJsonAsync<VersionComparisonDto>(
            $"/api/analytics/versions/compare?a={_versionA.Id}&b={_versionB.Id}"))!;

        comparison.A.Overview.Sessions.ShouldBe(1);
        comparison.B.Overview.Sessions.ShouldBe(0);
        (await _analyst.GetAsync($"/api/analytics/versions/compare?a={_versionA.Id}&b={Guid.NewGuid()}")).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [DbFact]
    public async Task AiComparison_ByConfiguration_MatchesHandComputedNumbers()
    {
        var rows = (await _analyst.GetFromJsonAsync<List<AiComparisonRowDto>>("/api/analytics/ai/comparison?source=replay"))!;

        var greedy = rows.Single(r => r.GroupLabel == "greedy");
        greedy.Encounters.ShouldBe(2); // the aborted one does not count
        greedy.CaptureRate.ShouldBe(0.5);
        greedy.AvgEscapeSeconds.ShouldBe(60);
        greedy.Replans.ShouldBe(2);
        greedy.LatencyP50Ms.ShouldBe(20);
        greedy.AvgCoordinationScore!.Value.ShouldBe(0.5, 1e-9);
        greedy.FallbackRate.ShouldBe(0.5);

        // Encounters without any re-plan still count toward capture rate
        var sqa = rows.Single(r => r.GroupLabel == "sqa");
        sqa.Encounters.ShouldBe(2);
        sqa.CaptureRate.ShouldBe(1);
        sqa.Replans.ShouldBe(0);
    }

    [DbFact]
    public async Task AiComparison_ByFamily_AddsUpConfigurations()
    {
        var byConfiguration = (await _analyst.GetFromJsonAsync<List<AiComparisonRowDto>>("/api/analytics/ai/comparison?source=replay"))!;
        var byFamily = (await _analyst.GetFromJsonAsync<List<AiComparisonRowDto>>("/api/analytics/ai/comparison?source=replay&groupBy=family"))!;

        foreach (var family in byFamily)
        {
            var members = byConfiguration.Where(r => r.Family == family.GroupKey).ToList();
            family.Encounters.ShouldBe(members.Sum(m => m.Encounters));
            family.Captures.ShouldBe(members.Sum(m => m.Captures));
            family.Replans.ShouldBe(members.Sum(m => m.Replans));
        }
        byFamily.Select(f => f.GroupKey).ShouldBe(["Classical", "QuantumInspired"], ignoreOrder: true);
    }

    [DbFact]
    public async Task SolverComparisons_RequireSource()
    {
        (await _analyst.GetAsync("/api/analytics/ai/comparison")).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await _analyst.GetAsync("/api/analytics/ai/scalability")).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [DbFact]
    public async Task Scalability_GroupsByAgentsAndNodeBucket()
    {
        var rows = (await _analyst.GetFromJsonAsync<List<ScalabilityRowDto>>("/api/analytics/ai/scalability?source=replay"))!;

        var row = rows.Single();
        (row.Code, row.NumAgents, row.NodesFrom, row.NodesTo, row.Replans, row.LatencyP50Ms).ShouldBe(("greedy", 3, 20, 39, 2L, 20.0));
    }

    [DbFact]
    public async Task Export_StreamsCsvWithBomAndGuardsTextOnly()
    {
        var response = await _analyst.GetAsync("/api/analytics/export/sessions?source=replay");
        var bytes = await response.Content.ReadAsByteArrayAsync();
        var csv = Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3);

        response.Content.Headers.ContentType!.MediaType.ShouldBe("text/csv");
        bytes.Take(3).ShouldBe(Encoding.UTF8.Preamble.ToArray());
        csv.Split("\r\n", StringSplitOptions.RemoveEmptyEntries).Length.ShouldBe(3);
        csv.ShouldContain("'=HYPERLINK(1)");

        var results = await _analyst.GetStringAsync("/api/analytics/export/coordination-results?source=replay");
        results.ShouldContain(",-12.5,"); // a negative number is not a formula
    }

    [DbFact]
    public async Task Export_EventsNeedsWindowAndDesignersCannotExport()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var from = Uri.EscapeDataString(T.AddDays(-1).ToString("O"));
        var to = Uri.EscapeDataString(T.AddDays(1).ToString("O"));

        (await _analyst.GetAsync("/api/analytics/export/events")).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await _analyst.GetAsync($"/api/analytics/export/events?from={from}&to={to}")).StatusCode.ShouldBe(HttpStatusCode.OK);
        (await _analyst.GetAsync("/api/analytics/export/unknown")).StatusCode.ShouldBe(HttpStatusCode.NotFound);
        (await designer.GetAsync("/api/analytics/export/sessions")).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await designer.GetAsync("/api/analytics/overview")).StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    private static SessionUpload Upload(Guid installId, string source, List<EncounterStats> encounters)
    {
        var upload = GameData.Upload(installId, source, events: 0);
        upload.Stats = new SessionStats { Encounters = encounters };
        upload.CoordinationResults = [];
        return upload;
    }

    private static EncounterStats Encounter(int index, string outcome, int seconds) => new()
    {
        Index = index, Outcome = outcome, StartedAt = T.AddMinutes(index + 1), EndedAt = T.AddMinutes(index + 1).AddSeconds(seconds), NumAgents = 3
    };

    private static CoordinationResultDto Result(string variant, double latency, double score, bool fallback) => new()
    {
        Id = Guid.NewGuid(), Variant = variant, TaskType = "RouteCoverage", NumAgents = 3, NumNodes = 24,
        ObjectiveValue = -12.5, SolveLatencyMs = latency, WithinBudget = true, UsedFallback = fallback,
        CoordinationScore = score, TriggeredAt = T.AddMinutes(1)
    };

    private static TelemetryEventDto Event(string type, float? x = null, float? y = null, Dictionary<string, object?>? payload = null) => new()
    {
        ClientEventId = Guid.NewGuid(), EventType = type, OccurredAt = T.AddMinutes(2), PosX = x, PosY = y, Payload = payload
    };
}
