using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Repositories.Interfaces;

public sealed record ContentCounts(int Items, int Skills, int LootTables, int EnemyTypes, int Maps, int CraftingRecipes, int Quests);

// Everything one content version holds, with child rows loaded (read-only, not tracked)
public sealed record ContentSnapshot(
    ContentVersion Version,
    List<Item> Items,
    List<Skill> Skills,
    List<LootTable> LootTables,
    List<EnemyType> EnemyTypes,
    List<Map> Maps,
    List<CraftingRecipe> CraftingRecipes,
    List<Quest> Quests);

// Authoring side of the content platform (the game only reads, through IGameContentRepository)
public interface IContentRepository
{
    // Versions. The tracked ones include the people (author, reviewer, publisher) for display.
    Task<ContentVersion?> GetVersionAsync(Guid id, CancellationToken ct = default);
    Task<ContentVersion?> GetPublishedVersionAsync(CancellationToken ct = default);
    Task<bool> VersionExistsAsync(Guid id, CancellationToken ct = default);
    Task<(List<ContentVersion> Items, int TotalCount)> SearchVersionsAsync(ContentStatus? status, int page, int pageSize, CancellationToken ct = default);
    Task<ContentCounts> GetCountsAsync(Guid versionId, CancellationToken ct = default);
    Task<ContentSnapshot?> LoadSnapshotAsync(Guid versionId, CancellationToken ct = default);

    Task<(List<ContentPublicationHistory> Items, int TotalCount)> GetHistoryAsync(int page, int pageSize, CancellationToken ct = default);
    void AddHistory(ContentPublicationHistory entry);

    // Content rows of one version. List is read-only; Find is tracked so it can be changed and saved.
    // Child rows (weapon stats, loot entries, ingredients, placements, rewards) come with their parent.
    Task<List<T>> ListAsync<T>(Guid versionId, CancellationToken ct = default) where T : ContentEntity;
    Task<T?> FindAsync<T>(Guid versionId, Guid id, CancellationToken ct = default) where T : ContentEntity;

    // id -> code of every row of that type in the version, to turn references into codes and back
    Task<Dictionary<Guid, string>> CodesAsync<T>(Guid versionId, CancellationToken ct = default) where T : ContentEntity;

    void Add<T>(T entity) where T : BaseEntity;
    void Remove<T>(T entity) where T : BaseEntity;

    // Human-readable descriptions of the rows that still point at the given row, e.g. "loot table 'loot_tier_1'"
    Task<List<string>> ReferencesToItemAsync(Guid itemId, CancellationToken ct = default);
    Task<List<string>> ReferencesToLootTableAsync(Guid lootTableId, CancellationToken ct = default);
    Task<List<string>> ReferencesToSkillAsync(Guid skillId, CancellationToken ct = default);
    Task<List<string>> ReferencesToEnemyTypeAsync(Guid enemyTypeId, CancellationToken ct = default);
    Task<List<string>> ReferencesToQuestAsync(Guid versionId, string questCode, CancellationToken ct = default);

    Task ExecuteInTransactionAsync(Func<Task> work, CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
