using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using ShadowVale.API.Authentication;
using ShadowVale.Contracts.Game;
using ShadowVale.Contracts.Telemetry;
using ShadowVale.DAL.Entities;
using ShadowVale.IntegrationTests.Infrastructure;
using Shouldly;

namespace ShadowVale.IntegrationTests.Game;

public class GameApiTests(ApiFixture api) : IntegrationTest(api)
{
    private static string SessionUrl(Guid id) => $"/api/game/sessions/{id}";

    [DbTheory]
    [InlineData(null)]
    [InlineData("wrong-key-0123456789abcdef0123456789")]
    public async Task WithoutValidKey_Returns401(string? key)
    {
        var client = key is null ? Api.CreateClient() : Api.CreateGameClient(key);

        (await client.GetAsync("/api/game/content/manifest")).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [DbFact]
    public async Task UserJwt_IsNotAGameKey()
    {
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);

        (await admin.GetAsync("/api/game/content/manifest")).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [DbFact]
    public async Task Manifest_WithNothingPublished_Returns404()
    {
        (await Api.CreateGameClient().GetAsync("/api/game/content/manifest")).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [DbFact]
    public async Task Bundle_ChecksumMatchesBytesAndSupportsConditionalGet()
    {
        var version = await GameData.PublishVersionAsync(Api, """{"schema_version": "1.0", "items": [{"code": "rifle", "name": "Rifle ☆"}]}""");
        var game = Api.CreateGameClient();

        var manifest = (await game.GetFromJsonAsync<ContentManifest>("/api/game/content/manifest"))!;
        var bundle = await game.GetAsync("/api/game/content/bundle");
        var bytes = await bundle.Content.ReadAsByteArrayAsync();

        manifest.VersionId.ShouldBe(version.Id);
        Convert.ToHexStringLower(SHA256.HashData(bytes)).ShouldBe(manifest.Checksum);
        bundle.Headers.ETag!.Tag.ShouldBe($"\"{manifest.Checksum}\"");

        foreach (var etag in new[] { $"\"{manifest.Checksum}\"", $"W/\"{manifest.Checksum}\"", $"\"other\", \"{manifest.Checksum}\"", "*" })
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/api/game/content/bundle");
            request.Headers.TryAddWithoutValidation("If-None-Match", etag);
            (await game.SendAsync(request)).StatusCode.ShouldBe(HttpStatusCode.NotModified, etag);
        }

        using var stale = new HttpRequestMessage(HttpMethod.Get, "/api/game/content/bundle");
        stale.Headers.IfNoneMatch.Add(new EntityTagHeaderValue("\"stale\""));
        (await game.SendAsync(stale)).StatusCode.ShouldBe(HttpStatusCode.OK);

        (await game.GetAsync($"/api/game/content/versions/{version.Id}/bundle")).StatusCode.ShouldBe(HttpStatusCode.OK);
        (await game.GetAsync($"/api/game/content/versions/{Guid.NewGuid()}/bundle")).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [DbFact]
    public async Task StartSession_Human_IsStableAndAssignsAnActiveArm()
    {
        await Api.SeedSolverConfigurationsAsync();
        var game = Api.CreateGameClient();
        var request = GameData.StartRequest(Guid.NewGuid(), Guid.NewGuid());

        var first = await (await game.PostAsJsonAsync("/api/game/sessions", request)).Content.ReadFromJsonAsync<StartSessionResponse>();
        var again = await (await game.PostAsJsonAsync("/api/game/sessions", request)).Content.ReadFromJsonAsync<StartSessionResponse>();

        first!.Solver!.Code.ShouldBeOneOf("greedy", "sqa");
        again!.Solver!.ConfigurationId.ShouldBe(first.Solver.ConfigurationId);
        first.Solver.TimeBudgetMs.ShouldBe(120);
        first.Solver.QuboWeights.Count.ShouldBe(6);

        var otherInstall = GameData.StartRequest(request.SessionId, Guid.NewGuid());
        (await game.PostAsJsonAsync("/api/game/sessions", otherInstall)).StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [DbFact]
    public async Task StartSession_Replay_UsesRequestedConfiguration()
    {
        await Api.SeedSolverConfigurationsAsync();
        var game = Api.CreateGameClient();

        var response = await game.PostAsJsonAsync("/api/game/sessions", GameData.StartRequest(Guid.NewGuid(), Guid.NewGuid(), "replay", "qiea"));
        var unknown = await game.PostAsJsonAsync("/api/game/sessions", GameData.StartRequest(Guid.NewGuid(), Guid.NewGuid(), "replay", "nope"));
        var humanWithVariant = await game.PostAsJsonAsync("/api/game/sessions", GameData.StartRequest(Guid.NewGuid(), Guid.NewGuid(), "human", "qiea"));

        var solver = (await response.Content.ReadFromJsonAsync<StartSessionResponse>())!.Solver!;
        solver.Code.ShouldBe("qiea");
        solver.Variant.ShouldBe("qiea");
        solver.Params.ShouldContainKey("population");
        unknown.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        humanWithVariant.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [DbFact]
    public async Task StartSession_WithoutActiveArms_ReturnsNoSolver()
    {
        var response = await Api.CreateGameClient().PostAsJsonAsync("/api/game/sessions", GameData.StartRequest(Guid.NewGuid(), Guid.NewGuid()));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await response.Content.ReadFromJsonAsync<StartSessionResponse>())!.Solver.ShouldBeNull();
    }

    [DbFact]
    public async Task Upload_SentTwice_StoresOnceAndReportsDuplicates()
    {
        await Api.SeedSolverConfigurationsAsync();
        var game = Api.CreateGameClient();
        var sessionId = Guid.NewGuid();
        var installId = Guid.NewGuid();
        await game.PostAsJsonAsync("/api/game/sessions", GameData.StartRequest(sessionId, installId, "replay", "sqa"));
        var upload = GameData.Upload(installId, "replay");
        upload.Events.Add(new TelemetryEventDto { ClientEventId = Guid.NewGuid(), EventType = "jumped", OccurredAt = GameData.Start });

        var first = (await (await game.PutAsJsonAsync(SessionUrl(sessionId), upload)).Content.ReadFromJsonAsync<SessionUploadResponse>())!;
        var second = (await (await game.PutAsJsonAsync(SessionUrl(sessionId), upload)).Content.ReadFromJsonAsync<SessionUploadResponse>())!;

        first.Events.Accepted.ShouldBe(3);
        first.Events.Rejected.ShouldBe(1);
        first.CoordinationResults.Accepted.ShouldBe(1);
        second.Events.Accepted.ShouldBe(0);
        second.Events.Duplicate.ShouldBe(3);
        second.CoordinationResults.Duplicate.ShouldBe(1);

        var session = await Api.WithDbAsync(db => db.GameSessions.Include(s => s.SolverConfiguration).SingleAsync());
        session.Outcome.ShouldBe(SessionOutcome.Completed);
        session.Source.ShouldBe(SessionSource.Replay);
        session.SolverConfiguration!.Code.ShouldBe("sqa");
        session.Stats.ShouldContain("PlayerCaptured");
        // +07:00 from the game is stored as UTC
        session.EndedAt.ShouldBe(GameData.Start.AddMinutes(15).UtcDateTime);
        (await Api.WithDbAsync(db => db.TelemetryEvents.CountAsync())).ShouldBe(3);
        (await Api.WithDbAsync(db => db.CoordinationResults.SingleAsync())).SolverConfigurationId.ShouldBe(session.SolverConfigurationId!.Value);
    }

    [DbFact]
    public async Task Upload_ConcurrentRetries_NeverDuplicateOrFail()
    {
        await Api.SeedSolverConfigurationsAsync();
        var sessionId = Guid.NewGuid();
        var upload = GameData.Upload(Guid.NewGuid(), events: 200);

        var responses = await Task.WhenAll(Enumerable.Range(0, 5)
            .Select(_ => Api.CreateGameClient().PutAsJsonAsync(SessionUrl(sessionId), upload)));

        responses.ShouldAllBe(r => r.StatusCode == HttpStatusCode.OK);
        (await Api.WithDbAsync(db => db.TelemetryEvents.CountAsync())).ShouldBe(200);
        (await Api.WithDbAsync(db => db.CoordinationResults.CountAsync())).ShouldBe(1);
        (await Api.WithDbAsync(db => db.GameSessions.CountAsync())).ShouldBe(1);
        (await Api.WithDbAsync(db => db.Players.CountAsync())).ShouldBe(1);
    }

    [DbFact]
    public async Task Upload_WithoutStart_KeepsSessionOutOfSolverComparison()
    {
        await Api.SeedSolverConfigurationsAsync();
        var sessionId = Guid.NewGuid();

        var response = await Api.CreateGameClient().PutAsJsonAsync(SessionUrl(sessionId), GameData.Upload(Guid.NewGuid(), variant: "greedy"));

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var session = await Api.WithDbAsync(db => db.GameSessions.SingleAsync());
        session.SolverConfigurationId.ShouldBeNull();
        // The result still names the configuration it came from
        (await Api.WithDbAsync(db => db.CoordinationResults.Include(r => r.SolverConfiguration).SingleAsync())).SolverConfiguration.Code.ShouldBe("greedy");
    }

    [DbFact]
    public async Task Upload_DifferentResultAfterFinish_Returns409()
    {
        var game = Api.CreateGameClient();
        var sessionId = Guid.NewGuid();
        var upload = GameData.Upload(Guid.NewGuid());
        (await game.PutAsJsonAsync(SessionUrl(sessionId), upload)).StatusCode.ShouldBe(HttpStatusCode.OK);

        upload.Outcome = "Died";

        (await game.PutAsJsonAsync(SessionUrl(sessionId), upload)).StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [DbFact]
    public async Task Upload_UnknownContentVersion_IsStoredAsNull()
    {
        var upload = GameData.Upload(Guid.NewGuid());
        upload.ContentVersionId = Guid.NewGuid();

        (await Api.CreateGameClient().PutAsJsonAsync(SessionUrl(Guid.NewGuid()), upload)).StatusCode.ShouldBe(HttpStatusCode.OK);
        (await Api.WithDbAsync(db => db.GameSessions.SingleAsync())).ContentVersionId.ShouldBeNull();
    }

    [DbFact]
    public async Task Upload_BrokenBatch_Returns400()
    {
        var upload = GameData.Upload(Guid.NewGuid());
        upload.EndedAt = upload.StartedAt.AddMinutes(-1);

        (await Api.CreateGameClient().PutAsJsonAsync(SessionUrl(Guid.NewGuid()), upload)).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await Api.WithDbAsync(db => db.GameSessions.CountAsync())).ShouldBe(0);
    }

    [DbFact]
    public async Task Upload_OverTwoMegabytes_Returns413()
    {
        // The in-memory test server ignores body size limits, so this runs on real Kestrel
        await using var kestrel = Api.CreateKestrelFactory();
        var client = kestrel.CreateClient();
        client.DefaultRequestHeaders.Add(GameKeyAuthenticationHandler.HeaderName, ApiFixture.GameKey);
        var body = new StringContent("{\"padding\":\"" + new string('x', 2 * 1024 * 1024 + 10) + "\"}", Encoding.UTF8, "application/json");

        var response = await client.PutAsync(SessionUrl(Guid.NewGuid()), body);

        response.StatusCode.ShouldBe(HttpStatusCode.RequestEntityTooLarge);
    }
}
