using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories;

// Opt-in development fixtures. Never changes existing content, users, or the Published version.
var write = args.Contains("--seed");
var repair = args.Contains("--refresh-fixture-validation");
var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Default");
if (string.IsNullOrWhiteSpace(connection))
{
    var file = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "Microsoft", "UserSecrets", "cd94e605-7641-4a65-ad08-1e0dcc677072", "secrets.json");
    if (File.Exists(file))
    {
        using var secrets = JsonDocument.Parse(await File.ReadAllTextAsync(file));
        if (secrets.RootElement.TryGetProperty("ConnectionStrings:Default", out var value)) connection = value.GetString();
    }
}
if (string.IsNullOrWhiteSpace(connection)) throw new InvalidOperationException("Configure ConnectionStrings__Default or API user-secrets first.");
var target = new NpgsqlConnectionStringBuilder(connection);
Console.WriteLine($"Target: {target.Host}:{target.Port}/{target.Database}; mode: {(write ? "seed" : "inspect")}");
await using var db = new ShadowValeDbContext(new DbContextOptionsBuilder<ShadowValeDbContext>()
    .UseNpgsql(connection).UseSnakeCaseNamingConvention().Options);
try
{
    var users = await db.Users.AsNoTracking().Where(u => u.IsActive && (u.Role == UserRole.Admin || u.Role == UserRole.Designer))
        .Select(u => new { u.Id, u.Role }).ToListAsync();
    var current = await db.ContentVersions.AsNoTracking().Where(v => v.Status == ContentStatus.Published)
        .Select(v => new { v.Id, v.Label, v.Revision }).ToListAsync();
    Console.WriteLine(JsonSerializer.Serialize(new { ActiveAuthorRoles = users.Select(u => u.Role.ToString()), Published = current }));
    var ids = new[] { Guid.Parse("019a0000-0000-7000-8000-000000000001"), Guid.Parse("019a0000-0000-7000-8000-000000000002") };
    if (!write && !repair)
    {
        Console.WriteLine(JsonSerializer.Serialize(await db.ContentVersions.AsNoTracking().OrderBy(v => v.VersionNo)
            .Select(v => new { v.Id, v.Label, v.Status, v.Revision, Items = v.Items.Count, Maps = v.Maps.Count }).ToListAsync()));
        if (args.Contains("--verify"))
        {
            var repo = new ContentVersionRepository(db);
            foreach (var id in ids)
            {
                var v = await repo.GetSnapshotAsync(id) ?? throw new InvalidOperationException("Fixture missing.");
                var built = ContentBundleBuilder.Build(v);
                var errors = new ContentBundleValidator().Validate(built);
                var canonical = ContentVersionService.CanonicalJson(System.Text.Json.Nodes.JsonNode.Parse(v.Bundle!));
                var checksum = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
                if (errors.Count != 0 || checksum != v.BundleChecksum || canonical != ContentVersionService.CanonicalJson(built))
                    throw new InvalidOperationException("Persisted fixture failed schema, checksum, or snapshot equality.");
                Console.WriteLine($"Verified {v.Label}: {v.Items.Count(i => i.Weapon != null)} weapons, {v.Maps.Count} maps, {v.Maps.Count(m => m.IsSafeCamp)} Safe Camp; bundle/checksum valid.");
            }
        }
        return;
    }
    var author = users.FirstOrDefault(u => u.Role == UserRole.Designer) ?? users.FirstOrDefault(u => u.Role == UserRole.Admin)
        ?? throw new InvalidOperationException("An active Designer or Admin is required; this tool does not create users.");
    await using var tx = await db.Database.BeginTransactionAsync();
    await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(734021987)");
    var existing = await db.ContentVersions.Where(v => ids.Contains(v.Id)).ToListAsync();
    if (repair)
    {
        if (existing.Count != 2 || existing.Any(v => v.Status != ContentStatus.Draft || v.Revision != 1))
            throw new InvalidOperationException("Refresh only accepts the two untouched seed Drafts at revision 1.");
        foreach (var v in existing)
        {
            await db.Entry(v).Collection(x => x.Items).Query().Include(i => i.Weapon).LoadAsync();
            await db.Entry(v).Collection(x => x.Maps).LoadAsync();
            var bundle = ContentBundleBuilder.Build(v);
            var issues = new ContentBundleValidator().Validate(bundle);
            if (issues.Count != 0) throw new InvalidOperationException(JsonSerializer.Serialize(issues));
            v.Bundle = ContentVersionService.CanonicalJson(bundle);
            v.BundleChecksum = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(v.Bundle)));
            v.ValidatedAt = DateTime.UtcNow;
            v.ValidationErrors = "[]";
            v.Revision++;
        }
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        foreach (var v in existing) Print(v);
        return;
    }
    if (existing.Count == 1) throw new InvalidOperationException("Partial seed exists; inspect it manually. Nothing was changed.");
    if (existing.Count == 2)
    {
        Console.WriteLine("Both fixtures already exist; keeping all edits and review/publication state.");
        foreach (var v in existing.OrderBy(v => v.VersionNo)) Print(v);
        await tx.CommitAsync();
        return;
    }
    var baseline = Build(ids[0], author.Id, false);
    var update = Build(ids[1], author.Id, true);
    update.ParentVersionId = baseline.Id;
    db.ContentVersions.AddRange(baseline, update);
    await db.SaveChangesAsync(); // Obtain generated version numbers before constructing bundles.
    var validator = new ContentBundleValidator();
    foreach (var version in new[] { baseline, update })
    {
        var bundle = ContentBundleBuilder.Build(version);
        var issues = validator.Validate(bundle);
        if (issues.Count != 0) throw new InvalidOperationException(JsonSerializer.Serialize(issues));
        version.Bundle = ContentVersionService.CanonicalJson(bundle);
        version.BundleChecksum = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(version.Bundle)));
        version.ValidatedAt = DateTime.UtcNow;
        version.ValidationErrors = "[]";
        version.Revision++;
    }
    await db.SaveChangesAsync();
    await tx.CommitAsync();
    foreach (var v in new[] { baseline, update }) Print(v);
    Console.WriteLine("Created exactly two validated Drafts. Existing content and Published version were preserved.");
}
catch (Exception ex) when (ex is NpgsqlException || ex is DbUpdateException)
{
    Console.Error.WriteLine($"Database operation failed ({ex.GetType().Name}); no connection credentials are printed.");
    Environment.ExitCode = 1;
}

static void Print(ContentVersion v) => Console.WriteLine(JsonSerializer.Serialize(new {
    v.Id, v.VersionNo, v.Label, Status = v.Status.ToString(), v.Revision, v.ParentVersionId, v.BundleChecksum
}));

static ContentVersion Build(Guid id, Guid author, bool update)
{
    var v = new ContentVersion { Id = id, AuthoredById = author, Label = update ? "TEST Weapon balance V2" : "TEST Weapon baseline V1",
        Changelog = update ? "Rifle damage 30 -> 40; reload 2.5 -> 2; pistol fire rate 2 -> 3. Maps unchanged." : "Baseline weapon stats and two maps for workflow tests." };
    var rifleAmmo = new Item { ContentVersionId = id, Code = "test_ammo_rifle", Name = "Test Rifle Ammo", Type = ItemType.Ammo,
        MaxStack = 90, Weight = 0.02m, BaseValue = 1 };
    var pistolAmmo = new Item { ContentVersionId = id, Code = "test_ammo_pistol", Name = "Test Pistol Ammo", Type = ItemType.Ammo,
        MaxStack = 60, Weight = 0.01m, BaseValue = 1 };
    Item Gun(string code, WeaponClass type, Item ammo, decimal damage, decimal rate, decimal reload, int magazine)
    {
        var item = new Item { ContentVersionId = id, Code = code, Name = "Test " + type, Type = ItemType.Weapon,
            MaxStack = 1, Weight = 2, BaseValue = 100, IconKey = code };
        item.Weapon = new Weapon { ItemId = item.Id, Class = type, AmmoItemId = ammo.Id,
            Damage = damage, FireRate = rate, EffectiveRange = 30, MagazineSize = magazine,
            ReloadTimeSeconds = reload, MaxDurability = 100, DurabilityPerUse = 1, NoiseRadius = 15 };
        return item;
    }
    v.Items = [rifleAmmo, pistolAmmo, Gun("test_rifle", WeaponClass.Rifle, rifleAmmo, update ? 40 : 30, 5, update ? 2 : 2.5m, 30),
        Gun("test_pistol", WeaponClass.Pistol, pistolAmmo, 15, update ? 3 : 2, 1.5m, 12)];
    v.Maps = [new Map { ContentVersionId = id, Code = "test_safe_camp", Name = "Test Safe Camp", SceneKey = "test_safe_camp",
        IsSafeCamp = true, SortOrder = 0 }, new Map { ContentVersionId = id, Code = "test_field", Name = "Test Field",
        SceneKey = "test_field", IsSafeCamp = false, SortOrder = 1 }];
    return v;
}
