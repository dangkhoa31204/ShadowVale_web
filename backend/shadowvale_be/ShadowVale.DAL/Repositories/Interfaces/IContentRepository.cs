using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Repositories.Interfaces;

// Content rows of a version: items, skills, loot tables, enemy types, maps, recipes and quests.
// The version itself and its review / publish workflow live in IContentVersionRepository.
public interface IContentRepository
{
    // Tracked, so an edit can move the version's revision on and clear its validated bundle
    Task<ContentVersion?> GetVersionAsync(Guid id, CancellationToken ct = default);
    Task<bool> VersionExistsAsync(Guid id, CancellationToken ct = default);

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
