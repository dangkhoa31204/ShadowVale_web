using System.Text.Json;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Validators;
using ShadowVale.Contracts.Game;
using ShadowVale.Contracts.Telemetry;
using ShadowVale.DAL.Entities;
using Shouldly;

namespace ShadowVale.BLL.Tests.Validators;

public class GameSessionValidatorTests
{
    private static readonly DateTimeOffset Start = new(2026, 10, 9, 15, 0, 0, TimeSpan.FromHours(7));
    private static readonly Guid SessionId = Guid.NewGuid();

    private static StartSessionRequest StartRequest(string source = "human", string? variant = null) => new()
    {
        SessionId = SessionId,
        InstallId = Guid.NewGuid(),
        Source = source,
        RequestedVariant = variant,
        MapCode = "map01",
        ClientVersion = "0.1.0",
        Platform = "windows",
        StartedAt = Start
    };

    private static SessionUpload Upload() => new()
    {
        InstallId = Guid.NewGuid(),
        Source = "human",
        MapCode = "map01",
        Platform = "windows",
        StartedAt = Start,
        EndedAt = Start.AddMinutes(20),
        Outcome = "Completed",
        Stats = new SessionStats
        {
            Takedowns = 2,
            Encounters =
            [
                new EncounterStats { Index = 0, Outcome = "playerescaped", StartedAt = Start.AddMinutes(1), EndedAt = Start.AddMinutes(2), NumAgents = 3 }
            ]
        },
        Events = [Event()],
        CoordinationResults = [Result()]
    };

    private static TelemetryEventDto Event(string type = TelemetryEventTypes.ShotFired, int minute = 5) => new()
    {
        ClientEventId = Guid.NewGuid(), EventType = type, OccurredAt = Start.AddMinutes(minute),
        Payload = new Dictionary<string, object?> { ["weapon"] = "rifle" }
    };

    private static CoordinationResultDto Result(string task = "Flanking", int agents = 3) => new()
    {
        Id = Guid.NewGuid(), Variant = "sqa", TaskType = task, NumAgents = agents, NumNodes = 20,
        SolveLatencyMs = 40, TriggeredAt = Start.AddMinutes(6)
    };

    private static void ShouldFailOn(string field, Action action) =>
        Should.Throw<ValidationException>(action).Errors.Keys.ShouldContain(k => k.StartsWith(field));

    [Fact]
    public void ValidateStart_HumanWithRequestedVariant_Fails() =>
        ShouldFailOn("RequestedVariant", () => GameSessionValidator.ValidateStart(StartRequest("human", "sqa")));

    [Fact]
    public void ValidateStart_ReplayWithoutRequestedVariant_Fails() =>
        ShouldFailOn("RequestedVariant", () => GameSessionValidator.ValidateStart(StartRequest("replay")));

    [Fact]
    public void ValidateStart_UnknownSource_Fails() =>
        ShouldFailOn("Source", () => GameSessionValidator.ValidateStart(StartRequest("bot")));

    [Fact]
    public void ValidateStart_Replay_ReturnsSource() =>
        GameSessionValidator.ValidateStart(StartRequest("Replay", "sqa")).ShouldBe(SessionSource.Replay);

    [Fact]
    public void ValidateUpload_ValidBatch_KeepsEverythingAndNormalizesStats()
    {
        var result = GameSessionValidator.ValidateUpload(SessionId, Upload());

        result.Outcome.ShouldBe(SessionOutcome.Completed);
        result.Events.Count.ShouldBe(1);
        result.Results.Count.ShouldBe(1);
        result.RejectedEvents.ShouldBe(0);
        var stats = JsonDocument.Parse(result.StatsJson).RootElement;
        stats.GetProperty("takedowns").GetInt32().ShouldBe(2);
        var encounter = stats.GetProperty("encounters")[0];
        encounter.GetProperty("outcome").GetString().ShouldBe("PlayerEscaped");
        // Stored in UTC whatever offset the game sent
        encounter.GetProperty("startedAt").GetDateTimeOffset().Offset.ShouldBe(TimeSpan.Zero);
        encounter.GetProperty("startedAt").GetDateTimeOffset().ShouldBe(Start.AddMinutes(1));
    }

    public static TheoryData<string, Action<SessionUpload>> BrokenBatches => new()
    {
        { "Outcome", u => u.Outcome = "InProgress" },
        { "Outcome", u => u.Outcome = "Won" },
        { "EndedAt", u => u.EndedAt = default },
        { "EndedAt", u => u.EndedAt = u.StartedAt.AddSeconds(-1) },
        { "InstallId", u => u.InstallId = Guid.Empty },
        { "Platform", u => u.Platform = "" },
        { "Source", u => u.Source = "bot" },
        { "Stats", u => u.Stats = null },
        { "Stats", u => u.Stats!.Takedowns = -1 },
        { "Stats.ShotsByWeapon", u => u.Stats!.ShotsByWeapon["rifle"] = -3 },
        { "Stats.Encounters", u => u.Stats!.Encounters.Add(new EncounterStats { Index = 0, Outcome = "PlayerCaptured", StartedAt = Start, EndedAt = Start }) },
        { "Stats.Encounters", u => u.Stats!.Encounters[0].Outcome = "Draw" },
        { "Stats.Encounters", u => u.Stats!.Encounters[0].EndedAt = Start },
        { "Events.ClientEventId", u => u.Events.Add(new TelemetryEventDto { ClientEventId = u.Events[0].ClientEventId, EventType = "takedown", OccurredAt = Start }) },
        { "Events.ClientEventId", u => u.Events[0].ClientEventId = Guid.Empty },
        { "CoordinationResults.Id", u => u.CoordinationResults[0].Id = Guid.Empty },
        { "Events", u => u.Events.AddRange(Enumerable.Range(0, GameSessionValidator.MaxEvents).Select(_ => Event())) },
        { "Batch", u => u.Events.Add(null!) }
    };

    [Theory]
    [MemberData(nameof(BrokenBatches))]
    public void ValidateUpload_BrokenBatch_FailsWholeBatch(string field, Action<SessionUpload> breakIt)
    {
        var upload = Upload();
        breakIt(upload);

        ShouldFailOn(field, () => GameSessionValidator.ValidateUpload(SessionId, upload));
    }

    [Fact]
    public void ValidateUpload_DuplicateResultId_FailsWholeBatch()
    {
        var upload = Upload();
        var duplicate = Result();
        duplicate.Id = upload.CoordinationResults[0].Id;
        upload.CoordinationResults.Add(duplicate);

        ShouldFailOn("CoordinationResults.Id", () => GameSessionValidator.ValidateUpload(SessionId, upload));
    }

    [Fact]
    public void ValidateUpload_BadItems_AreDroppedAndCounted()
    {
        var upload = Upload();
        upload.Events.Add(Event("jumped"));                    // unknown type
        upload.Events.Add(Event(minute: -2));                  // before the session (beyond 1 min tolerance)
        upload.Events.Add(Event(minute: 26));                  // after the session (beyond 5 min tolerance)
        upload.Events.Add(Event(minute: 24));                  // within the 5 min tolerance: kept
        var big = Event();
        big.Payload = new Dictionary<string, object?> { ["blob"] = new string('x', GameSessionValidator.MaxPayloadBytes) };
        upload.Events.Add(big);
        upload.CoordinationResults.Add(Result(task: "Surround"));
        upload.CoordinationResults.Add(Result(agents: 0));

        var result = GameSessionValidator.ValidateUpload(SessionId, upload);

        result.Events.Count.ShouldBe(2);
        result.RejectedEvents.ShouldBe(4);
        result.Results.Count.ShouldBe(1);
        result.RejectedResults.ShouldBe(2);
    }
}
