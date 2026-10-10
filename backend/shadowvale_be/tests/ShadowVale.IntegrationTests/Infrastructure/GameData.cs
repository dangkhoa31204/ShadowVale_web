using Microsoft.AspNetCore.Identity;
using ShadowVale.Contracts.Game;
using ShadowVale.Contracts.Telemetry;
using ShadowVale.DAL.Entities;

namespace ShadowVale.IntegrationTests.Infrastructure;

// Builders for game requests and rows the game API reads
public static class GameData
{
    public static readonly DateTimeOffset Start = new(2026, 10, 9, 20, 0, 0, TimeSpan.FromHours(7));

    public static StartSessionRequest StartRequest(Guid sessionId, Guid installId, string source = "human", string? variant = null) => new()
    {
        SessionId = sessionId,
        InstallId = installId,
        Source = source,
        RequestedVariant = variant,
        MapCode = "map01",
        ClientVersion = "0.1.0",
        Platform = "windows",
        StartedAt = Start
    };

    public static SessionUpload Upload(Guid installId, string source = "human", int events = 3, string variant = "sqa") => new()
    {
        InstallId = installId,
        Source = source,
        MapCode = "map01",
        ClientVersion = "0.1.0",
        Platform = "windows",
        StartedAt = Start,
        EndedAt = Start.AddMinutes(15),
        Outcome = "Completed",
        Stats = new SessionStats
        {
            EventCounts = new() { [TelemetryEventTypes.ShotFired] = events },
            ShotsByWeapon = new() { ["rifle_standard"] = events },
            KillsByWeapon = new() { ["rifle_standard"] = 1 },
            Takedowns = 2,
            WeaponKills = 1,
            TimesDetected = 1,
            Encounters =
            [
                new EncounterStats { Index = 0, Outcome = "PlayerEscaped", StartedAt = Start.AddMinutes(2), EndedAt = Start.AddMinutes(3), NumAgents = 3, NumReplans = 1, CoordinationScore = 0.5 },
                new EncounterStats { Index = 1, Outcome = "PlayerCaptured", StartedAt = Start.AddMinutes(8), EndedAt = Start.AddMinutes(9), NumAgents = 2 }
            ]
        },
        Events = Enumerable.Range(0, events).Select(i => new TelemetryEventDto
        {
            ClientEventId = Guid.NewGuid(),
            EventType = TelemetryEventTypes.ShotFired,
            OccurredAt = Start.AddMinutes(1).AddSeconds(i),
            PosX = 10 + i,
            PosY = 20,
            Payload = new Dictionary<string, object?> { ["weapon"] = "rifle_standard" }
        }).ToList(),
        CoordinationResults =
        [
            new CoordinationResultDto
            {
                Id = Guid.NewGuid(), Variant = variant, TaskType = "Flanking", NumAgents = 3, NumNodes = 24, NumQuboVars = 72,
                ObjectiveValue = -12.5, SolveLatencyMs = 41.5, WithinBudget = true, CoordinationScore = 0.5,
                TriggeredAt = Start.AddMinutes(2).AddSeconds(5)
            }
        ]
    };

    // A published content version needs an author
    public static async Task<ContentVersion> PublishVersionAsync(ApiFixture api, string bundleJson, string label = "v1")
    {
        return await api.WithDbAsync(async db =>
        {
            var author = db.Users.FirstOrDefault() ?? new User { Username = "author", Email = "author@shadowvale.test", Role = UserRole.Designer };
            if (author.PasswordHash is null)
            {
                author.PasswordHash = new PasswordHasher<User>().HashPassword(author, ApiFixture.Password);
                db.Users.Add(author);
            }

            var version = new ContentVersion
            {
                Label = label,
                Status = ContentStatus.Published,
                Bundle = bundleJson,
                BundleChecksum = "set-by-content-module",
                AuthoredBy = author,
                PublishedAt = DateTime.UtcNow
            };
            db.ContentVersions.Add(version);
            await db.SaveChangesAsync();
            return version;
        });
    }
}
