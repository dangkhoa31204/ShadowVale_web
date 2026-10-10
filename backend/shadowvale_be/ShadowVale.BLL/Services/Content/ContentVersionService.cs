using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Mappings;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services.Content;

// Content versions and their workflow: Draft -> InReview -> Approved -> Published -> Archived.
// - Only a Draft (or Rejected) version can be edited, and only a version that validates can be submitted.
// - Publishing archives the previously published version; exactly one version is Published at any time.
// - Rolling back re-publishes an archived version. Every publish and rollback is logged in the publication history.
// - Every state change bumps Revision (a concurrency token), so two people acting on one version cannot both succeed.
public class ContentVersionService(IContentRepository content, ContentEditor editor, TimeProvider time) : IContentVersionService
{
    public async Task<PagedResult<ContentVersionDto>> GetAllAsync(ContentVersionQuery query, CancellationToken ct = default)
    {
        var status = EnumParsing.ParseOptional<ContentStatus>(query.Status, nameof(query.Status));
        var (items, total) = await content.SearchVersionsAsync(status, query.Page, query.PageSize, ct);
        return new PagedResult<ContentVersionDto>(items.Select(v => ToDto(v, null)).ToList(), query.Page, query.PageSize, total);
    }

    public async Task<ContentVersionDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var version = await FindAsync(id, ct);
        return ToDto(version, ToDto(await content.GetCountsAsync(id, ct)));
    }

    public async Task<ContentVersionDto> CreateAsync(CreateContentVersionRequest request, Guid actorId, CancellationToken ct = default)
    {
        var version = new ContentVersion
        {
            Label = request.Label.Trim(),
            Changelog = request.Changelog?.Trim(),
            Status = ContentStatus.Draft,
            AuthoredById = actorId,
            ParentVersionId = request.BaseVersionId
        };

        ContentSnapshot? source = null;
        if (request.BaseVersionId is { } baseId)
            source = await content.LoadSnapshotAsync(baseId, ct) ?? throw new ValidationException(nameof(request.BaseVersionId), "The base content version does not exist.");

        content.Add(version);
        if (source is not null)
            CloneContent(source, version.Id);

        await editor.SaveAsync(ct);
        return await GetByIdAsync(version.Id, ct);
    }

    public async Task<ContentVersionDto> UpdateAsync(Guid id, UpdateContentVersionRequest request, CancellationToken ct = default)
    {
        var version = await FindAsync(id, ct);
        // The label and changelog can still be corrected on any version that is not final
        if (version.Status is ContentStatus.Published or ContentStatus.Archived)
            throw new ConflictException($"Content version {version.VersionNo} is {version.Status}; its label can no longer change.");

        version.Label = request.Label.Trim();
        version.Changelog = request.Changelog?.Trim();
        version.Revision++;

        await editor.SaveAsync(ct);
        return ToDto(version, null);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var version = await FindAsync(id, ct);
        if (version.Status is not (ContentStatus.Draft or ContentStatus.Rejected))
            throw new ConflictException($"Content version {version.VersionNo} is {version.Status} and cannot be deleted. Only a Draft or Rejected version can.");

        content.Remove(version);
        await editor.SaveAsync(ct);
    }

    public async Task<ValidationReportDto> ValidateAsync(Guid id, CancellationToken ct = default)
    {
        var version = await FindAsync(id, ct);
        var (result, text, checksum) = await BuildAsync(id, ct);

        // Only versions still open for changes keep the outcome; others are final and are just reported on
        if (version.Status is ContentStatus.Draft or ContentStatus.Rejected)
        {
            Store(version, result, text, checksum);
            await editor.SaveAsync(ct);
        }

        return new ValidationReportDto(result.IsValid, result.Issues, checksum, ToDto(await content.GetCountsAsync(id, ct)));
    }

    public async Task<string> GetBundleAsync(Guid id, CancellationToken ct = default)
    {
        var version = await FindAsync(id, ct);
        return version.Bundle
            ?? throw new ConflictException($"Content version {version.VersionNo} has no validated bundle. Validate it first (and again after any edit).");
    }

    public async Task<ContentCompareDto> CompareAsync(Guid a, Guid b, CancellationToken ct = default)
    {
        var (resultA, _, _) = await BuildAsync(a, ct);
        var (resultB, _, _) = await BuildAsync(b, ct);
        var versionA = await FindAsync(a, ct);
        var versionB = await FindAsync(b, ct);

        var sections = new List<SectionDiffDto>();
        foreach (var name in ContentBundleBuilder.Sections)
        {
            var left = Index(resultA.Bundle[name] as JsonArray);
            var right = Index(resultB.Bundle[name] as JsonArray);

            var added = right.Keys.Except(left.Keys).Order().ToList();
            var removed = left.Keys.Except(right.Keys).Order().ToList();
            var changed = left.Keys.Intersect(right.Keys).Order()
                .Select(key => new ChangedEntryDto(key, ChangedFields(left[key], right[key])))
                .Where(c => c.Fields.Count > 0)
                .ToList();

            if (added.Count + removed.Count + changed.Count > 0)
                sections.Add(new SectionDiffDto(name, added, removed, changed));
        }

        // ai_settings is not a list of rows, so compare it as one entry
        var aiFields = ChangedFields(resultA.Bundle["ai_settings"] as JsonObject, resultB.Bundle["ai_settings"] as JsonObject);
        if (aiFields.Count > 0)
            sections.Add(new SectionDiffDto("ai_settings", [], [], [new ChangedEntryDto("ai_settings", aiFields)]));

        return new ContentCompareDto(
            new VersionRefDto(versionA.Id, versionA.VersionNo, versionA.Label),
            new VersionRefDto(versionB.Id, versionB.VersionNo, versionB.Label),
            sections.Count > 0,
            sections);
    }

    public async Task<ContentVersionDto> SubmitAsync(Guid id, CancellationToken ct = default)
    {
        var version = await FindAsync(id, ct);
        RequireStatus(version, "submitted for review", ContentStatus.Draft, ContentStatus.Rejected);

        var (result, text, checksum) = await BuildAsync(id, ct);
        Store(version, result, text, checksum);
        if (!result.IsValid)
        {
            await editor.SaveAsync(ct);
            throw new ValidationException(result.Issues.GroupBy(i => i.Path).ToDictionary(g => g.Key, g => g.Select(i => i.Message).ToArray()));
        }

        version.Status = ContentStatus.InReview;
        version.SubmittedAt = Now;
        version.ReviewedById = null;
        version.ReviewedAt = null;
        version.ReviewNote = null;
        version.Revision++;

        await editor.SaveAsync(ct);
        return ToDto(version, null);
    }

    public async Task<ContentVersionDto> ApproveAsync(Guid id, Guid actorId, ReviewNoteRequest request, CancellationToken ct = default)
    {
        var version = await FindAsync(id, ct);
        RequireStatus(version, "approved", ContentStatus.InReview);

        version.Status = ContentStatus.Approved;
        version.ReviewedById = actorId;
        version.ReviewedAt = Now;
        version.ReviewNote = request.Note?.Trim();
        version.Revision++;

        await editor.SaveAsync(ct);
        return ToDto(await FindAsync(id, ct), null);
    }

    public async Task<ContentVersionDto> RejectAsync(Guid id, Guid actorId, RejectContentVersionRequest request, CancellationToken ct = default)
    {
        var version = await FindAsync(id, ct);
        RequireStatus(version, "rejected", ContentStatus.InReview);

        version.Status = ContentStatus.Rejected;
        version.ReviewedById = actorId;
        version.ReviewedAt = Now;
        version.ReviewNote = request.Note.Trim();
        version.Revision++;

        await editor.SaveAsync(ct);
        return ToDto(await FindAsync(id, ct), null);
    }

    public async Task<ContentVersionDto> PublishAsync(Guid id, Guid actorId, PublishContentVersionRequest request, CancellationToken ct = default)
    {
        var version = await FindAsync(id, ct);
        RequireStatus(version, "published", ContentStatus.Approved);

        // Built again from the rows: an invalid bundle can never go live
        var (result, text, checksum) = await BuildAsync(id, ct);
        if (!result.IsValid)
            throw new ValidationException(result.Issues.GroupBy(i => i.Path).ToDictionary(g => g.Key, g => g.Select(i => i.Message).ToArray()));

        var reason = string.IsNullOrWhiteSpace(request.Reason) ? "Published" : request.Reason.Trim();
        await GoLiveAsync(version, text!, checksum!, actorId, PublishAction.Publish, reason, ct);
        return ToDto(await FindAsync(id, ct), null);
    }

    public async Task<ContentVersionDto> RollbackAsync(Guid id, Guid actorId, RollbackContentVersionRequest request, CancellationToken ct = default)
    {
        var version = await FindAsync(id, ct);
        RequireStatus(version, "rolled back to", ContentStatus.Archived);
        if (version.Bundle is null || version.BundleChecksum is null)
            throw new ConflictException($"Content version {version.VersionNo} has no stored bundle and cannot be rolled back to.");

        await GoLiveAsync(version, version.Bundle, version.BundleChecksum, actorId, PublishAction.Rollback, request.Reason.Trim(), ct);
        return ToDto(await FindAsync(id, ct), null);
    }

    public async Task<PagedResult<PublicationHistoryDto>> GetHistoryAsync(HistoryQuery query, CancellationToken ct = default)
    {
        var (items, total) = await content.GetHistoryAsync(query.Page, query.PageSize, ct);
        return new PagedResult<PublicationHistoryDto>(
            items.Select(h => new PublicationHistoryDto(
                h.Id, h.Action.ToString(), h.ContentVersionId, h.ContentVersion.VersionNo, h.ContentVersion.Label,
                h.PreviousVersionId, h.PreviousVersion?.VersionNo, h.ActorId, h.Actor?.Username, h.Reason, h.CreatedAt)).ToList(),
            query.Page, query.PageSize, total);
    }

    // Makes this version the single Published one. The old one is archived first (and saved), because the database
    // allows only one Published row at a time; both steps and the history entry share one transaction.
    private async Task GoLiveAsync(ContentVersion version, string bundle, string checksum, Guid actorId, PublishAction action, string reason, CancellationToken ct)
    {
        var current = await content.GetPublishedVersionAsync(ct);

        await content.ExecuteInTransactionAsync(async () =>
        {
            if (current is not null)
            {
                current.Status = ContentStatus.Archived;
                current.ArchivedAt = Now;
                current.Revision++;
                await editor.SaveAsync(ct);
            }

            version.Bundle = bundle;
            version.BundleChecksum = checksum;
            version.Status = ContentStatus.Published;
            version.PublishedAt = Now;
            version.PublishedById = actorId;
            version.ArchivedAt = null;
            version.Revision++;
            content.AddHistory(new ContentPublicationHistory
            {
                ContentVersionId = version.Id,
                PreviousVersionId = current?.Id,
                Action = action,
                ActorId = actorId,
                Reason = reason
            });
            await editor.SaveAsync(ct);
        }, ct);
    }

    // Builds the bundle for a version from its rows. ai_settings (solver defaults, QUBO weights, squad tuning) are not
    // authored here: they carry over from the published version, or from the game's fallback bundle on the first one.
    private async Task<(BundleBuildResult Result, string? Text, string? Checksum)> BuildAsync(Guid id, CancellationToken ct)
    {
        var snapshot = await content.LoadSnapshotAsync(id, ct) ?? throw new NotFoundException("Content version", id);
        var result = ContentBundleBuilder.Build(snapshot, await AiSettingsAsync(ct));
        if (!result.IsValid)
            return (result, null, null);

        var text = result.Bundle.ToJsonString();
        return (result, text, Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(text))));
    }

    private async Task<JsonNode?> AiSettingsAsync(CancellationToken ct)
    {
        var published = await content.GetPublishedVersionAsync(ct);
        if (published?.Bundle is not null && JsonNode.Parse(published.Bundle) is JsonObject { } bundle && bundle["ai_settings"] is { } settings)
            return settings;

        await using var stream = typeof(ContentVersionService).Assembly.GetManifestResourceStream("ShadowVale.BLL.Seeding.demo_bundle.json")
            ?? throw new InvalidOperationException("Embedded fallback bundle is missing.");
        return (await JsonNode.ParseAsync(stream, cancellationToken: ct))?["ai_settings"];
    }

    private void Store(ContentVersion version, BundleBuildResult result, string? text, string? checksum)
    {
        version.Bundle = text;
        version.BundleChecksum = checksum;
        version.ValidatedAt = text is null ? null : Now;
        version.ValidationErrors = result.IsValid
            ? null
            : System.Text.Json.JsonSerializer.Serialize(result.Issues, System.Text.Json.JsonSerializerOptions.Web);
        version.Revision++;
    }

    private static void RequireStatus(ContentVersion version, string action, params ContentStatus[] allowed)
    {
        if (!allowed.Contains(version.Status))
            throw new ConflictException(
                $"Content version {version.VersionNo} is {version.Status}; it can only be {action} from {string.Join(" or ", allowed)}.");
    }

    private async Task<ContentVersion> FindAsync(Guid id, CancellationToken ct) =>
        await content.GetVersionAsync(id, ct) ?? throw new NotFoundException("Content version", id);

    private DateTime Now => time.GetUtcNow().UtcDateTime;

    private static Dictionary<string, JsonNode> Index(JsonArray? array) =>
        (array ?? []).OfType<JsonObject>().ToDictionary(o => o["id"]!.GetValue<string>(), o => (JsonNode)o);

    // Top-level fields whose value differs (or exists on one side only)
    private static List<string> ChangedFields(JsonNode? a, JsonNode? b)
    {
        var left = a as JsonObject ?? new JsonObject();
        var right = b as JsonObject ?? new JsonObject();
        return left.Select(p => p.Key).Union(right.Select(p => p.Key)).Order()
            .Where(key => !JsonNode.DeepEquals(left[key], right[key]))
            .ToList();
    }

    // Copies every row of the source version into the new one with fresh ids, rewiring all references between rows
    private void CloneContent(ContentSnapshot s, Guid versionId)
    {
        var itemIds = s.Items.ToDictionary(i => i.Id, _ => Guid.CreateVersion7());
        var weaponIds = s.Items.Where(i => i.Weapon is not null).ToDictionary(i => i.Weapon!.Id, _ => Guid.CreateVersion7());
        var skillIds = s.Skills.ToDictionary(k => k.Id, _ => Guid.CreateVersion7());
        var lootIds = s.LootTables.ToDictionary(l => l.Id, _ => Guid.CreateVersion7());
        var enemyIds = s.EnemyTypes.ToDictionary(e => e.Id, _ => Guid.CreateVersion7());

        foreach (var i in s.Items)
        {
            content.Add(new Item
            {
                Id = itemIds[i.Id], ContentVersionId = versionId, Code = i.Code, Name = i.Name, Description = i.Description, Type = i.Type,
                Rarity = i.Rarity, MaxStack = i.MaxStack, Weight = i.Weight, BaseValue = i.BaseValue, Stats = i.Stats, IconKey = i.IconKey,
                Weapon = i.Weapon is null ? null : new Weapon
                {
                    Id = weaponIds[i.Weapon.Id], ItemId = itemIds[i.Id], Class = i.Weapon.Class, Damage = i.Weapon.Damage, FireRate = i.Weapon.FireRate,
                    EffectiveRange = i.Weapon.EffectiveRange, MagazineSize = i.Weapon.MagazineSize, ReloadTimeSeconds = i.Weapon.ReloadTimeSeconds,
                    AmmoItemId = i.Weapon.AmmoItemId is { } ammo ? itemIds[ammo] : null, MaxDurability = i.Weapon.MaxDurability,
                    DurabilityPerUse = i.Weapon.DurabilityPerUse, NoiseRadius = i.Weapon.NoiseRadius, IsSuppressed = i.Weapon.IsSuppressed
                },
                Consumable = i.Consumable is null ? null : new Consumable
                {
                    ItemId = itemIds[i.Id], HealHp = i.Consumable.HealHp, RestoreStamina = i.Consumable.RestoreStamina,
                    UseTimeSeconds = i.Consumable.UseTimeSeconds, Cures = [.. i.Consumable.Cures], ExtraEffects = i.Consumable.ExtraEffects
                }
            });
        }

        foreach (var k in s.Skills)
            content.Add(new Skill
            {
                Id = skillIds[k.Id], ContentVersionId = versionId, Code = k.Code, Name = k.Name, Type = k.Type, MaxLevel = k.MaxLevel,
                XpCurve = k.XpCurve, Effects = k.Effects
            });

        foreach (var l in s.LootTables)
            content.Add(new LootTable
            {
                Id = lootIds[l.Id], ContentVersionId = versionId, Code = l.Code, Name = l.Name, RollsMin = l.RollsMin, RollsMax = l.RollsMax,
                Entries = l.Entries.Select(e => new LootTableEntry
                {
                    LootTableId = lootIds[l.Id], ItemId = itemIds[e.ItemId], Tier = e.Tier, Weight = e.Weight, MinQuantity = e.MinQuantity, MaxQuantity = e.MaxQuantity
                }).ToList()
            });

        foreach (var e in s.EnemyTypes)
            content.Add(new EnemyType
            {
                Id = enemyIds[e.Id], ContentVersionId = versionId, Code = e.Code, Name = e.Name, Archetype = e.Archetype, IsBoss = e.IsBoss, MaxHp = e.MaxHp,
                MoveSpeed = e.MoveSpeed, VisionRange = e.VisionRange, VisionAngleDegrees = e.VisionAngleDegrees, HearingRange = e.HearingRange,
                Accuracy = e.Accuracy, FsmParams = e.FsmParams,
                WeaponId = e.WeaponId is { } w && weaponIds.TryGetValue(w, out var nw) ? nw : null,
                LootTableId = e.LootTableId is { } lt && lootIds.TryGetValue(lt, out var nl) ? nl : null
            });

        foreach (var m in s.Maps)
        {
            var mapId = Guid.CreateVersion7();
            content.Add(new Map
            {
                Id = mapId, ContentVersionId = versionId, Code = m.Code, Name = m.Name, SceneKey = m.SceneKey, IsSafeCamp = m.IsSafeCamp,
                SortOrder = m.SortOrder, NavGraph = m.NavGraph, Layout = m.Layout,
                EnemyPlacements = m.EnemyPlacements.Select(p => new EnemyPlacement
                {
                    MapId = mapId, EnemyTypeId = enemyIds[p.EnemyTypeId], SquadTag = p.SquadTag, PosX = p.PosX, PosY = p.PosY,
                    FacingDegrees = p.FacingDegrees, PatrolRoute = p.PatrolRoute, SpawnCondition = p.SpawnCondition
                }).ToList(),
                LootTables = m.LootTables.Select(l => new MapLootTable { MapId = mapId, LootTableId = lootIds[l.LootTableId], ContainerTag = l.ContainerTag }).ToList()
            });
        }

        foreach (var r in s.CraftingRecipes)
        {
            var recipeId = Guid.CreateVersion7();
            content.Add(new CraftingRecipe
            {
                Id = recipeId, ContentVersionId = versionId, Code = r.Code, Name = r.Name, OutputItemId = itemIds[r.OutputItemId], OutputQuantity = r.OutputQuantity,
                CraftTimeSeconds = r.CraftTimeSeconds, RequiredSkillId = r.RequiredSkillId is { } sk ? skillIds[sk] : null,
                RequiredSkillLevel = r.RequiredSkillLevel, Station = r.Station,
                Ingredients = r.Ingredients.Select(i => new CraftingRecipeIngredient { RecipeId = recipeId, ItemId = itemIds[i.ItemId], Quantity = i.Quantity }).ToList()
            });
        }

        foreach (var q in s.Quests)
        {
            var questId = Guid.CreateVersion7();
            content.Add(new Quest
            {
                Id = questId, ContentVersionId = versionId, Code = q.Code, Title = q.Title, Description = q.Description, IsMain = q.IsMain,
                SortOrder = q.SortOrder, Objectives = q.Objectives, Prerequisites = [.. q.Prerequisites], RewardXp = q.RewardXp,
                Rewards = q.Rewards.Select(r => new QuestReward { QuestId = questId, ItemId = itemIds[r.ItemId], Quantity = r.Quantity }).ToList()
            });
        }
    }

    private static ContentCountsDto ToDto(ContentCounts c) =>
        new(c.Items, c.Skills, c.LootTables, c.EnemyTypes, c.Maps, c.CraftingRecipes, c.Quests);

    private static ContentVersionDto ToDto(ContentVersion v, ContentCountsDto? counts) => new(
        v.Id, v.VersionNo, v.Label, v.Changelog, v.ParentVersionId, v.Status.ToString(), v.Revision, v.SchemaVersion,
        v.Bundle is not null && v.ValidatedAt is not null, v.ValidatedAt, v.BundleChecksum,
        v.ValidationErrors is null
            ? null
            : System.Text.Json.JsonSerializer.Deserialize<List<ContentIssueDto>>(v.ValidationErrors, System.Text.Json.JsonSerializerOptions.Web),
        new UserRefDto(v.AuthoredById, v.AuthoredBy.Username), v.SubmittedAt,
        v.ReviewedBy is null ? null : new UserRefDto(v.ReviewedBy.Id, v.ReviewedBy.Username), v.ReviewedAt, v.ReviewNote,
        v.PublishedBy is null ? null : new UserRefDto(v.PublishedBy.Id, v.PublishedBy.Username), v.PublishedAt, v.ArchivedAt,
        v.CreatedAt, v.UpdatedAt, counts);
}
