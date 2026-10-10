using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.DAL.Repositories;

public class ContentRepository(ShadowValeDbContext context) : IContentRepository
{
    private IQueryable<ContentVersion> VersionsWithPeople =>
        context.ContentVersions.Include(v => v.AuthoredBy).Include(v => v.ReviewedBy).Include(v => v.PublishedBy);

    public Task<ContentVersion?> GetVersionAsync(Guid id, CancellationToken ct = default) =>
        VersionsWithPeople.FirstOrDefaultAsync(v => v.Id == id, ct);

    public Task<ContentVersion?> GetPublishedVersionAsync(CancellationToken ct = default) =>
        VersionsWithPeople.FirstOrDefaultAsync(v => v.Status == ContentStatus.Published, ct);

    public Task<bool> VersionExistsAsync(Guid id, CancellationToken ct = default) =>
        context.ContentVersions.AnyAsync(v => v.Id == id, ct);

    public async Task<(List<ContentVersion> Items, int TotalCount)> SearchVersionsAsync(
        ContentStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var query = VersionsWithPeople.AsNoTracking();
        if (status is not null)
            query = query.Where(v => v.Status == status);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(v => v.VersionNo)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public async Task<ContentCounts> GetCountsAsync(Guid versionId, CancellationToken ct = default) => new(
        await context.Items.CountAsync(e => e.ContentVersionId == versionId, ct),
        await context.Skills.CountAsync(e => e.ContentVersionId == versionId, ct),
        await context.LootTables.CountAsync(e => e.ContentVersionId == versionId, ct),
        await context.EnemyTypes.CountAsync(e => e.ContentVersionId == versionId, ct),
        await context.Maps.CountAsync(e => e.ContentVersionId == versionId, ct),
        await context.CraftingRecipes.CountAsync(e => e.ContentVersionId == versionId, ct),
        await context.Quests.CountAsync(e => e.ContentVersionId == versionId, ct));

    public async Task<ContentSnapshot?> LoadSnapshotAsync(Guid versionId, CancellationToken ct = default)
    {
        var version = await context.ContentVersions.AsNoTracking().FirstOrDefaultAsync(v => v.Id == versionId, ct);
        if (version is null)
            return null;

        return new ContentSnapshot(
            version,
            await ListAsync<Item>(versionId, ct),
            await ListAsync<Skill>(versionId, ct),
            await ListAsync<LootTable>(versionId, ct),
            await ListAsync<EnemyType>(versionId, ct),
            await ListAsync<Map>(versionId, ct),
            await ListAsync<CraftingRecipe>(versionId, ct),
            await ListAsync<Quest>(versionId, ct));
    }

    public async Task<(List<ContentPublicationHistory> Items, int TotalCount)> GetHistoryAsync(
        int page, int pageSize, CancellationToken ct = default)
    {
        var query = context.ContentPublicationHistory.AsNoTracking();
        var total = await query.CountAsync(ct);
        var items = await query
            .Include(h => h.ContentVersion)
            .Include(h => h.PreviousVersion)
            .Include(h => h.Actor)
            .OrderByDescending(h => h.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return (items, total);
    }

    public void AddHistory(ContentPublicationHistory entry) => context.ContentPublicationHistory.Add(entry);

    public Task<List<T>> ListAsync<T>(Guid versionId, CancellationToken ct = default) where T : ContentEntity =>
        WithChildren(context.Set<T>().AsNoTracking().Where(e => e.ContentVersionId == versionId))
            .OrderBy(e => e.Code)
            .ToListAsync(ct);

    public Task<T?> FindAsync<T>(Guid versionId, Guid id, CancellationToken ct = default) where T : ContentEntity =>
        WithChildren(context.Set<T>().Where(e => e.ContentVersionId == versionId && e.Id == id))
            .FirstOrDefaultAsync(ct);

    public async Task<Dictionary<Guid, string>> CodesAsync<T>(Guid versionId, CancellationToken ct = default) where T : ContentEntity =>
        await context.Set<T>().AsNoTracking()
            .Where(e => e.ContentVersionId == versionId)
            .ToDictionaryAsync(e => e.Id, e => e.Code, ct);

    public void Add<T>(T entity) where T : BaseEntity => context.Set<T>().Add(entity);

    public void Remove<T>(T entity) where T : BaseEntity => context.Set<T>().Remove(entity);

    // Loading the child rows with the parent keeps one query per type, whatever the number of children
    private static IQueryable<T> WithChildren<T>(IQueryable<T> query) where T : ContentEntity
    {
        object source = query;
        object result = source switch
        {
            IQueryable<Item> q => q.Include(i => i.Weapon).Include(i => i.Consumable),
            IQueryable<LootTable> q => q.Include(l => l.Entries),
            IQueryable<Map> q => q.Include(m => m.EnemyPlacements).Include(m => m.LootTables).AsSplitQuery(),
            IQueryable<CraftingRecipe> q => q.Include(r => r.Ingredients),
            IQueryable<Quest> q => q.Include(x => x.Rewards),
            _ => source
        };
        return (IQueryable<T>)result;
    }

    public async Task<List<string>> ReferencesToItemAsync(Guid itemId, CancellationToken ct = default)
    {
        var references = new List<string>();
        references.AddRange((await context.Weapons.Where(w => w.AmmoItemId == itemId).Select(w => w.Item.Code).ToListAsync(ct))
            .Select(c => $"weapon '{c}' (as ammo)"));
        references.AddRange((await context.LootTableEntries.Where(e => e.ItemId == itemId).Select(e => e.LootTable.Code).Distinct().ToListAsync(ct))
            .Select(c => $"loot table '{c}'"));
        references.AddRange((await context.CraftingRecipes.Where(r => r.OutputItemId == itemId).Select(r => r.Code).ToListAsync(ct))
            .Select(c => $"recipe '{c}' (as output)"));
        references.AddRange((await context.CraftingRecipeIngredients.Where(i => i.ItemId == itemId).Select(i => i.Recipe.Code).Distinct().ToListAsync(ct))
            .Select(c => $"recipe '{c}' (as ingredient)"));
        references.AddRange((await context.QuestRewards.Where(r => r.ItemId == itemId).Select(r => r.Quest.Code).Distinct().ToListAsync(ct))
            .Select(c => $"quest '{c}' (as reward)"));
        references.AddRange((await context.EnemyTypes.Where(e => e.Weapon != null && e.Weapon.ItemId == itemId).Select(e => e.Code).ToListAsync(ct))
            .Select(c => $"enemy type '{c}' (as weapon)"));
        return references;
    }

    public async Task<List<string>> ReferencesToLootTableAsync(Guid lootTableId, CancellationToken ct = default)
    {
        var references = new List<string>();
        references.AddRange((await context.EnemyTypes.Where(e => e.LootTableId == lootTableId).Select(e => e.Code).ToListAsync(ct))
            .Select(c => $"enemy type '{c}'"));
        references.AddRange((await context.MapLootTables.Where(m => m.LootTableId == lootTableId).Select(m => m.Map.Code).Distinct().ToListAsync(ct))
            .Select(c => $"map '{c}'"));
        return references;
    }

    public async Task<List<string>> ReferencesToSkillAsync(Guid skillId, CancellationToken ct = default) =>
        (await context.CraftingRecipes.Where(r => r.RequiredSkillId == skillId).Select(r => r.Code).ToListAsync(ct))
            .Select(c => $"recipe '{c}'").ToList();

    public async Task<List<string>> ReferencesToEnemyTypeAsync(Guid enemyTypeId, CancellationToken ct = default) =>
        (await context.EnemyPlacements.Where(p => p.EnemyTypeId == enemyTypeId).Select(p => p.Map.Code).Distinct().ToListAsync(ct))
            .Select(c => $"map '{c}'").ToList();

    public async Task<List<string>> ReferencesToQuestAsync(Guid versionId, string questCode, CancellationToken ct = default) =>
        (await context.Quests.Where(q => q.ContentVersionId == versionId && q.Prerequisites.Contains(questCode)).Select(q => q.Code).ToListAsync(ct))
            .Select(c => $"quest '{c}' (as prerequisite)").ToList();

    public async Task ExecuteInTransactionAsync(Func<Task> work, CancellationToken ct = default)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(ct);
        await work();
        await transaction.CommitAsync(ct);
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => context.SaveChangesAsync(ct);
}
