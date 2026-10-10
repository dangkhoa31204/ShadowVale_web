using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.DTOs.Content;

namespace ShadowVale.BLL.Interfaces;

// Content versions and their review / publish workflow:
// Draft -> InReview -> Approved -> Published -> Archived (a rejected version goes back to Draft on its next edit)
public interface IContentVersionService
{
    Task<PagedResult<ContentVersionDto>> GetAllAsync(ContentVersionQuery query, CancellationToken ct = default);
    Task<ContentVersionDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ContentVersionDto> CreateAsync(CreateContentVersionRequest request, Guid actorId, CancellationToken ct = default);
    Task<ContentVersionDto> UpdateAsync(Guid id, UpdateContentVersionRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);

    // Builds the bundle and checks it; stores the result. Never throws for invalid content: the report lists the problems.
    Task<ValidationReportDto> ValidateAsync(Guid id, CancellationToken ct = default);
    // The validated bundle exactly as the game would receive it (409 when not validated since the last edit)
    Task<string> GetBundleAsync(Guid id, CancellationToken ct = default);
    Task<ContentCompareDto> CompareAsync(Guid a, Guid b, CancellationToken ct = default);

    Task<ContentVersionDto> SubmitAsync(Guid id, CancellationToken ct = default);
    Task<ContentVersionDto> ApproveAsync(Guid id, Guid actorId, ReviewNoteRequest request, CancellationToken ct = default);
    Task<ContentVersionDto> RejectAsync(Guid id, Guid actorId, RejectContentVersionRequest request, CancellationToken ct = default);
    Task<ContentVersionDto> PublishAsync(Guid id, Guid actorId, PublishContentVersionRequest request, CancellationToken ct = default);
    Task<ContentVersionDto> RollbackAsync(Guid id, Guid actorId, RollbackContentVersionRequest request, CancellationToken ct = default);

    Task<PagedResult<PublicationHistoryDto>> GetHistoryAsync(HistoryQuery query, CancellationToken ct = default);
}

public interface IItemService
{
    Task<IReadOnlyList<ItemDto>> GetAllAsync(Guid versionId, ItemQuery query, CancellationToken ct = default);
    Task<ItemDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default);
    Task<ItemDto> CreateAsync(Guid versionId, CreateItemRequest request, CancellationToken ct = default);
    Task<ItemDto> UpdateAsync(Guid versionId, Guid id, SaveItemRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default);
}

public interface ISkillService
{
    Task<IReadOnlyList<SkillDto>> GetAllAsync(Guid versionId, CancellationToken ct = default);
    Task<SkillDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default);
    Task<SkillDto> CreateAsync(Guid versionId, CreateSkillRequest request, CancellationToken ct = default);
    Task<SkillDto> UpdateAsync(Guid versionId, Guid id, SaveSkillRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default);
}

public interface ILootTableService
{
    Task<IReadOnlyList<LootTableDto>> GetAllAsync(Guid versionId, CancellationToken ct = default);
    Task<LootTableDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default);
    Task<LootTableDto> CreateAsync(Guid versionId, CreateLootTableRequest request, CancellationToken ct = default);
    Task<LootTableDto> UpdateAsync(Guid versionId, Guid id, SaveLootTableRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default);
}

public interface IEnemyTypeService
{
    Task<IReadOnlyList<EnemyTypeDto>> GetAllAsync(Guid versionId, CancellationToken ct = default);
    Task<EnemyTypeDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default);
    Task<EnemyTypeDto> CreateAsync(Guid versionId, CreateEnemyTypeRequest request, CancellationToken ct = default);
    Task<EnemyTypeDto> UpdateAsync(Guid versionId, Guid id, SaveEnemyTypeRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default);
}

public interface IMapService
{
    Task<IReadOnlyList<MapSummaryDto>> GetAllAsync(Guid versionId, CancellationToken ct = default);
    Task<MapDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default);
    Task<MapDto> CreateAsync(Guid versionId, CreateMapRequest request, CancellationToken ct = default);
    Task<MapDto> UpdateAsync(Guid versionId, Guid id, SaveMapRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default);
}

public interface ICraftingRecipeService
{
    Task<IReadOnlyList<CraftingRecipeDto>> GetAllAsync(Guid versionId, CancellationToken ct = default);
    Task<CraftingRecipeDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default);
    Task<CraftingRecipeDto> CreateAsync(Guid versionId, CreateCraftingRecipeRequest request, CancellationToken ct = default);
    Task<CraftingRecipeDto> UpdateAsync(Guid versionId, Guid id, SaveCraftingRecipeRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default);
}

public interface IQuestService
{
    Task<IReadOnlyList<QuestDto>> GetAllAsync(Guid versionId, CancellationToken ct = default);
    Task<QuestDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default);
    Task<QuestDto> CreateAsync(Guid versionId, CreateQuestRequest request, CancellationToken ct = default);
    Task<QuestDto> UpdateAsync(Guid versionId, Guid id, SaveQuestRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default);
}
