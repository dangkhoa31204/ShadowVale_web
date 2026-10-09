using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Mappings;
using ShadowVale.Contracts.Telemetry;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services;

// FAKE telemetry so the dashboards can be built and shown before the game sends real data.
// Development only, behind Seed:DemoData=true (see Program.cs). Every row is marked client_version = "demo-seed",
// old demo rows are replaced on each run, and it refuses to run when the database holds any other session.
// The numbers are random with the same distribution for every solver: they say nothing about the research.
public class DemoDataSeeder(
    IDemoDataRepository demo,
    ISolverConfigurationRepository solverConfigurations,
    TimeProvider time,
    ILogger<DemoDataSeeder> logger) : IDemoDataSeeder
{
    public const string Marker = "demo-seed";
    private const int SessionCount = 300;
    private const int PlayerCount = 40;
    private const string MapCode = "map01_docks";

    private static readonly string[] Weapons = ["rifle_standard", "smg_compact", "shotgun_pump", "pistol_silenced", "sniper_bolt", "carbine_scout"];

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await demo.HasSessionsOtherThanAsync(Marker, ct))
        {
            logger.LogWarning("Demo data not seeded: the database already has real sessions");
            return;
        }

        var authorId = await demo.GetAnyUserIdAsync(ct);
        if (authorId is null)
        {
            logger.LogWarning("Demo data not seeded: create a user first (it authors the demo content version)");
            return;
        }

        var removed = await demo.DeleteSessionsAsync(Marker, ct);
        var versionId = await EnsureVersionAsync(authorId.Value, ct);
        var configurations = await solverConfigurations.GetAllAsync(ct);
        var runnable = configurations.Where(c => c.Algorithm != SolverAlgorithm.QpuDwave).OrderBy(c => c.Code).ToList();

        var random = new Random(2026);
        var now = time.GetUtcNow().UtcDateTime;
        var installs = Enumerable.Range(0, PlayerCount).Select(_ => NewGuid(random)).ToList();
        var players = await demo.GetPlayerIdsByInstallAsync(installs, ct);
        foreach (var install in installs.Where(i => !players.ContainsKey(i)))
        {
            var player = new Player { InstallId = install, LastSeenAt = now };
            demo.Add(player);
            players[install] = player.Id;
        }

        for (var i = 0; i < SessionCount; i++)
        {
            var sessionId = NewGuid(random);
            var source = i % 10 < 7 ? SessionSource.Human : SessionSource.Replay;
            var solver = source == SessionSource.Human
                ? SolverAssignment.ForHuman(sessionId, configurations)
                : runnable.Count == 0 ? null : runnable[random.Next(runnable.Count)];
            AddSession(random, sessionId, players[installs[random.Next(PlayerCount)]], source, solver, versionId, now, unfinished: i % 50 == 0);
        }

        await demo.SaveChangesAsync(ct);
        logger.LogWarning("Seeded {Count} FAKE demo sessions (replaced {Removed}); do not use them as research data", SessionCount, removed);
    }

    private async Task<Guid?> EnsureVersionAsync(Guid authorId, CancellationToken ct)
    {
        if (await demo.AnyVersionEverPublishedAsync(ct))
            return await demo.GetPublishedVersionIdAsync(ct);

        // The game's built-in fallback bundle, so the game API also has something to serve
        await using var stream = typeof(DemoDataSeeder).Assembly.GetManifestResourceStream("ShadowVale.BLL.Seeding.demo_bundle.json")
            ?? throw new InvalidOperationException("Embedded demo bundle is missing.");
        var bundle = await new StreamReader(stream).ReadToEndAsync(ct);
        var version = new ContentVersion
        {
            Label = $"Demo content ({Marker})",
            Status = ContentStatus.Published,
            Bundle = bundle,
            BundleChecksum = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(bundle))),
            AuthoredById = authorId,
            PublishedById = authorId,
            PublishedAt = time.GetUtcNow().UtcDateTime
        };
        demo.Add(version);
        return version.Id;
    }

    private void AddSession(Random random, Guid sessionId, Guid playerId, SessionSource source, SolverConfiguration? solver,
        Guid? versionId, DateTime now, bool unfinished)
    {
        var startedAt = now.AddDays(-random.Next(30)).AddMinutes(-random.Next(24 * 60)).AddMinutes(-30);
        var session = new GameSession
        {
            Id = sessionId,
            PlayerId = playerId,
            ContentVersionId = versionId,
            SolverConfigurationId = solver?.Id,
            Source = source,
            MapCode = MapCode,
            StartedAt = startedAt,
            ClientVersion = Marker,
            Platform = "windows"
        };
        demo.Add(session);
        if (unfinished)
            return;

        var endedAt = startedAt.AddMinutes(4 + random.Next(22));
        var outcome = Pick(random, (SessionOutcome.Completed, 45), (SessionOutcome.Died, 35), (SessionOutcome.Quit, 15), (SessionOutcome.Crashed, 5));
        session.EndedAt = endedAt;
        session.Outcome = outcome;

        var events = new List<TelemetryEvent>();
        void Event(string type, Dictionary<string, object?>? payload = null, bool positioned = false) => events.Add(new TelemetryEvent
        {
            SessionId = sessionId,
            ClientEventId = NewGuid(random),
            EventType = type,
            MapCode = MapCode,
            PosX = positioned ? random.Next(0, 200) : null,
            PosY = positioned ? random.Next(0, 120) : null,
            OccurredAt = startedAt.AddSeconds(random.Next((int)(endedAt - startedAt).TotalSeconds)),
            Payload = JsonSerializer.Serialize(payload ?? []),
            ReceivedAt = endedAt
        });

        // Counters
        var shots = new Dictionary<string, int>();
        var kills = new Dictionary<string, int>();
        foreach (var weapon in Weapons.OrderBy(_ => random.Next()).Take(1 + random.Next(3)))
        {
            shots[weapon] = random.Next(5, 120);
            kills[weapon] = random.Next(0, 1 + shots[weapon] / 15);
        }
        var takedowns = random.Next(0, 7);
        var timesDetected = random.Next(0, 9);

        for (var p = 0; p < 3; p++)
            Event(TelemetryEventTypes.PlayerPosition, positioned: true);
        foreach (var (weapon, count) in shots)
        {
            for (var s = 0; s < Math.Min(count, 3); s++)
                Event(TelemetryEventTypes.ShotFired, new() { ["weapon"] = weapon }, positioned: true);
        }
        for (var d = 0; d < timesDetected; d++)
            Event(TelemetryEventTypes.PlayerSpotted, positioned: true);
        var objectives = outcome == SessionOutcome.Completed ? 3 : random.Next(0, 3);
        for (var o = 0; o < objectives; o++)
            Event(TelemetryEventTypes.ObjectiveCompleted, new() { ["index"] = o });
        if (outcome == SessionOutcome.Died)
            Event(TelemetryEventTypes.PlayerDeath, positioned: true);
        if (outcome is SessionOutcome.Completed or SessionOutcome.Died)
            Event(TelemetryEventTypes.MissionResult, new() { ["result"] = outcome == SessionOutcome.Completed ? "completed" : "failed" });

        // Encounters and their re-plans
        var encounters = new List<EncounterStats>();
        var results = new List<CoordinationResult>();
        var encounterCount = random.Next(0, 5);
        for (var e = 0; e < encounterCount; e++)
        {
            var encounterStart = startedAt.AddSeconds(random.Next((int)(endedAt - startedAt).TotalSeconds - 120));
            var agents = random.Next(2, 7);
            var replans = solver is null ? 0 : random.Next(0, 4);
            var fallbacks = 0;
            var scores = new List<double>();

            for (var r = 0; r < replans; r++)
            {
                var nodes = random.Next(10, 81);
                // Size-driven latency, identical for every solver (fake data must not suggest a winner)
                var latency = 5 + nodes * 0.8 + agents * 4 + random.NextDouble() * 40;
                var withinBudget = latency <= solver!.TimeBudgetMs;
                var score = Math.Round(0.3 + random.NextDouble() * 0.6, 3);
                fallbacks += withinBudget ? 0 : 1;
                scores.Add(score);
                results.Add(new CoordinationResult
                {
                    SessionId = sessionId,
                    SolverConfigurationId = solver.Id,
                    MapCode = MapCode,
                    SquadTag = $"squad_{e}",
                    TaskType = (CoordinationTask)random.Next(3),
                    NumAgents = agents,
                    NumNodes = nodes,
                    NumQuboVars = agents * nodes / 4,
                    ObjectiveValue = -Math.Round(random.NextDouble() * 50, 3),
                    SolveLatencyMs = Math.Round(latency, 2),
                    WithinBudget = withinBudget,
                    UsedFallback = !withinBudget,
                    CoordinationScore = score,
                    TriggeredAt = encounterStart.AddSeconds(5 + r * 10)
                });
            }

            encounters.Add(new EncounterStats
            {
                Index = e,
                Outcome = Pick(random, (EncounterOutcome.PlayerCaptured, 35), (EncounterOutcome.PlayerEscaped, 45),
                    (EncounterOutcome.SquadEliminated, 15), (EncounterOutcome.Aborted, 5)).ToString(),
                StartedAt = new DateTimeOffset(encounterStart, TimeSpan.Zero),
                EndedAt = new DateTimeOffset(encounterStart.AddSeconds(10 + random.Next(110)), TimeSpan.Zero),
                NumAgents = agents,
                NumReplans = replans,
                NumFallbacks = fallbacks,
                CoordinationScore = scores.Count == 0 ? null : Math.Round(scores.Average(), 3)
            });
        }

        var eventCounts = events.GroupBy(ev => ev.EventType).ToDictionary(g => g.Key, g => g.Count());
        eventCounts[TelemetryEventTypes.ShotFired] = shots.Values.Sum();
        session.Stats = JsonSerializer.Serialize(new SessionStats
        {
            EventCounts = eventCounts,
            ShotsByWeapon = shots,
            KillsByWeapon = kills,
            Takedowns = takedowns,
            WeaponKills = kills.Values.Sum(),
            TimesDetected = timesDetected,
            Encounters = encounters
        }, JsonSerializerOptions.Web);

        demo.AddRange(events);
        demo.AddRange(results);
    }

    private static T Pick<T>(Random random, params (T Value, int Weight)[] options)
    {
        var roll = random.Next(options.Sum(o => o.Weight));
        foreach (var (value, weight) in options)
        {
            if (roll < weight)
                return value;
            roll -= weight;
        }
        return options[^1].Value;
    }

    private static Guid NewGuid(Random random)
    {
        var bytes = new byte[16];
        random.NextBytes(bytes);
        return new Guid(bytes);
    }
}
