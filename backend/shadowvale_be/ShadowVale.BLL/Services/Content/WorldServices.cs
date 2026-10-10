using System.Text.Json;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Interfaces;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services.Content;

public class EnemyTypeService(IContentRepository content, ContentEditor editor) : IEnemyTypeService
{
    public async Task<IReadOnlyList<EnemyTypeDto>> GetAllAsync(Guid versionId, CancellationToken ct = default)
    {
        await editor.EnsureVersionExistsAsync(versionId, ct);
        var (weapons, lootTables) = await LookupsAsync(versionId, ct);
        return (await content.ListAsync<EnemyType>(versionId, ct)).Select(e => ToDto(e, weapons, lootTables)).ToList();
    }

    public async Task<EnemyTypeDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default)
    {
        var enemy = await FindAsync(versionId, id, ct);
        var (weapons, lootTables) = await LookupsAsync(versionId, ct);
        return ToDto(enemy, weapons, lootTables);
    }

    public async Task<EnemyTypeDto> CreateAsync(Guid versionId, CreateEnemyTypeRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        ContentEditor.EnsureCodeFree((await content.CodesAsync<EnemyType>(versionId, ct)).Values, request.Code, "Enemy type");

        var (weapons, lootTables) = await LookupsAsync(versionId, ct);
        var enemy = new EnemyType { ContentVersionId = versionId, Code = request.Code };
        Apply(enemy, request, weapons, lootTables);
        content.Add(enemy);

        await editor.SaveAsync(ct);
        return ToDto(enemy, weapons, lootTables);
    }

    public async Task<EnemyTypeDto> UpdateAsync(Guid versionId, Guid id, SaveEnemyTypeRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var enemy = await FindAsync(versionId, id, ct);
        var (weapons, lootTables) = await LookupsAsync(versionId, ct);
        Apply(enemy, request, weapons, lootTables);

        await editor.SaveAsync(ct);
        return ToDto(enemy, weapons, lootTables);
    }

    public async Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var enemy = await FindAsync(versionId, id, ct);
        ContentEditor.EnsureUnreferenced(await content.ReferencesToEnemyTypeAsync(id, ct), "Enemy type", enemy.Code);

        content.Remove(enemy);
        await editor.SaveAsync(ct);
    }

    // weapon row id -> code of its item; loot table id -> code
    private async Task<(Dictionary<Guid, string> Weapons, Dictionary<Guid, string> LootTables)> LookupsAsync(Guid versionId, CancellationToken ct)
    {
        var items = await content.ListAsync<Item>(versionId, ct);
        var weapons = items.Where(i => i.Weapon is not null).ToDictionary(i => i.Weapon!.Id, i => i.Code);
        return (weapons, await content.CodesAsync<LootTable>(versionId, ct));
    }

    private static void Apply(EnemyType enemy, SaveEnemyTypeRequest request, Dictionary<Guid, string> weapons, Dictionary<Guid, string> lootTables)
    {
        enemy.Name = request.Name.Trim();
        enemy.Archetype = request.Archetype.Trim();
        enemy.IsBoss = request.IsBoss;
        enemy.MaxHp = request.MaxHp;
        enemy.MoveSpeed = request.MoveSpeed;
        enemy.VisionRange = request.VisionRange;
        enemy.VisionAngleDegrees = request.VisionAngleDegrees;
        enemy.HearingRange = request.HearingRange;
        enemy.Accuracy = request.Accuracy;
        enemy.WeaponId = string.IsNullOrWhiteSpace(request.WeaponItemCode)
            ? null
            : ContentReferences.Require(weapons, request.WeaponItemCode, nameof(request.WeaponItemCode));
        enemy.LootTableId = string.IsNullOrWhiteSpace(request.LootTableCode)
            ? null
            : ContentReferences.Require(lootTables, request.LootTableCode, nameof(request.LootTableCode));
        enemy.FsmParams = ContentJson.Object(request.FsmParams, nameof(request.FsmParams));
    }

    private async Task<EnemyType> FindAsync(Guid versionId, Guid id, CancellationToken ct) =>
        await content.FindAsync<EnemyType>(versionId, id, ct) ?? throw new NotFoundException("Enemy type", id);

    private static EnemyTypeDto ToDto(EnemyType e, Dictionary<Guid, string> weapons, Dictionary<Guid, string> lootTables) => new(
        e.Id, e.Code, e.Name, e.Archetype, e.IsBoss, e.MaxHp, e.MoveSpeed, e.VisionRange, e.VisionAngleDegrees, e.HearingRange,
        e.Accuracy, ContentReferences.CodeOf(weapons, e.WeaponId), ContentReferences.CodeOf(lootTables, e.LootTableId),
        ContentJson.ToElement(e.FsmParams), e.UpdatedAt);
}

public class MapService(IContentRepository content, ContentEditor editor) : IMapService
{
    public async Task<IReadOnlyList<MapSummaryDto>> GetAllAsync(Guid versionId, CancellationToken ct = default)
    {
        await editor.EnsureVersionExistsAsync(versionId, ct);
        return (await content.ListAsync<Map>(versionId, ct))
            .OrderBy(m => m.SortOrder).ThenBy(m => m.Code)
            .Select(m => new MapSummaryDto(m.Id, m.Code, m.Name, m.SceneKey, m.IsSafeCamp, m.SortOrder, m.EnemyPlacements.Count, m.LootTables.Count, m.UpdatedAt))
            .ToList();
    }

    public async Task<MapDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default) =>
        ToDto(await FindAsync(versionId, id, ct), await content.CodesAsync<EnemyType>(versionId, ct), await content.CodesAsync<LootTable>(versionId, ct));

    public async Task<MapDto> CreateAsync(Guid versionId, CreateMapRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var maps = await content.ListAsync<Map>(versionId, ct);
        ContentEditor.EnsureCodeFree(maps.Select(m => m.Code), request.Code, "Map");
        EnsureSingleSafeCamp(maps, null, request.IsSafeCamp);

        var enemies = await content.CodesAsync<EnemyType>(versionId, ct);
        var lootTables = await content.CodesAsync<LootTable>(versionId, ct);
        var map = new Map { ContentVersionId = versionId, Code = request.Code };
        content.Add(map);
        Apply(map, request, enemies, lootTables);

        await editor.SaveAsync(ct);
        return ToDto(map, enemies, lootTables);
    }

    public async Task<MapDto> UpdateAsync(Guid versionId, Guid id, SaveMapRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var map = await FindAsync(versionId, id, ct);
        EnsureSingleSafeCamp(await content.ListAsync<Map>(versionId, ct), id, request.IsSafeCamp);

        var enemies = await content.CodesAsync<EnemyType>(versionId, ct);
        var lootTables = await content.CodesAsync<LootTable>(versionId, ct);
        Apply(map, request, enemies, lootTables);

        await editor.SaveAsync(ct);
        return ToDto(map, enemies, lootTables);
    }

    public async Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        content.Remove(await FindAsync(versionId, id, ct));
        await editor.SaveAsync(ct);
    }

    // Exactly one Safe Camp hub per version (also enforced when validating, since a version can have none yet)
    private static void EnsureSingleSafeCamp(List<Map> maps, Guid? self, bool isSafeCamp)
    {
        var other = maps.FirstOrDefault(m => m.IsSafeCamp && m.Id != self);
        if (isSafeCamp && other is not null)
            throw new ConflictException($"Map '{other.Code}' is already the Safe Camp of this content version. A version has exactly one.");
    }

    private void Apply(Map map, SaveMapRequest request, Dictionary<Guid, string> enemies, Dictionary<Guid, string> lootTables)
    {
        var placements = (request.EnemyPlacements ?? []).Select((p, i) => new EnemyPlacement
        {
            MapId = map.Id,
            EnemyTypeId = ContentReferences.Require(enemies, p.EnemyTypeCode, $"EnemyPlacements[{i}].EnemyTypeCode"),
            SquadTag = p.SquadTag.Trim(),
            PosX = p.PosX,
            PosY = p.PosY,
            FacingDegrees = p.FacingDegrees,
            PatrolRoute = ContentJson.Array(p.PatrolRoute, $"EnemyPlacements[{i}].PatrolRoute"),
            SpawnCondition = p.SpawnCondition is { ValueKind: JsonValueKind.Object } sc ? sc.GetRawText()
                : p.SpawnCondition is null or { ValueKind: JsonValueKind.Null } ? null
                : throw new ValidationException($"EnemyPlacements[{i}].SpawnCondition", "SpawnCondition must be a JSON object.")
        }).ToList();

        var links = (request.LootTables ?? []).Select((l, i) => new MapLootTable
        {
            MapId = map.Id,
            LootTableId = ContentReferences.Require(lootTables, l.LootTableCode, $"LootTables[{i}].LootTableCode"),
            ContainerTag = l.ContainerTag.Trim()
        }).ToList();

        map.Name = request.Name.Trim();
        map.SceneKey = request.SceneKey.Trim();
        map.IsSafeCamp = request.IsSafeCamp;
        map.SortOrder = request.SortOrder;
        map.NavGraph = ContentJson.Object(request.NavGraph, nameof(request.NavGraph));
        map.Layout = ContentJson.Object(request.Layout, nameof(request.Layout));

        foreach (var old in map.EnemyPlacements.ToList())
            content.Remove(old);
        foreach (var old in map.LootTables.ToList())
            content.Remove(old);
        foreach (var row in placements)
            content.Add(row);
        foreach (var row in links)
            content.Add(row);
    }

    private async Task<Map> FindAsync(Guid versionId, Guid id, CancellationToken ct) =>
        await content.FindAsync<Map>(versionId, id, ct) ?? throw new NotFoundException("Map", id);

    private static MapDto ToDto(Map m, Dictionary<Guid, string> enemies, Dictionary<Guid, string> lootTables) => new(
        m.Id, m.Code, m.Name, m.SceneKey, m.IsSafeCamp, m.SortOrder, ContentJson.ToElement(m.NavGraph), ContentJson.ToElement(m.Layout),
        m.EnemyPlacements.OrderBy(p => p.SquadTag).ThenBy(p => p.CreatedAt).Select(p => new EnemyPlacementDto(
            ContentReferences.CodeOf(enemies, p.EnemyTypeId) ?? "", p.SquadTag, p.PosX, p.PosY, p.FacingDegrees,
            ContentJson.ToElement(p.PatrolRoute), p.SpawnCondition is null ? null : ContentJson.ToElement(p.SpawnCondition))).ToList(),
        m.LootTables.OrderBy(l => l.ContainerTag).Select(l => new MapLootTableDto(ContentReferences.CodeOf(lootTables, l.LootTableId) ?? "", l.ContainerTag)).ToList(),
        m.UpdatedAt);
}

public class CraftingRecipeService(IContentRepository content, ContentEditor editor) : ICraftingRecipeService
{
    public async Task<IReadOnlyList<CraftingRecipeDto>> GetAllAsync(Guid versionId, CancellationToken ct = default)
    {
        await editor.EnsureVersionExistsAsync(versionId, ct);
        var items = await content.CodesAsync<Item>(versionId, ct);
        var skills = await content.CodesAsync<Skill>(versionId, ct);
        return (await content.ListAsync<CraftingRecipe>(versionId, ct)).Select(r => ToDto(r, items, skills)).ToList();
    }

    public async Task<CraftingRecipeDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default) =>
        ToDto(await FindAsync(versionId, id, ct), await content.CodesAsync<Item>(versionId, ct), await content.CodesAsync<Skill>(versionId, ct));

    public async Task<CraftingRecipeDto> CreateAsync(Guid versionId, CreateCraftingRecipeRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        ContentEditor.EnsureCodeFree((await content.CodesAsync<CraftingRecipe>(versionId, ct)).Values, request.Code, "Recipe");

        var items = await content.CodesAsync<Item>(versionId, ct);
        var skills = await content.CodesAsync<Skill>(versionId, ct);
        var recipe = new CraftingRecipe { ContentVersionId = versionId, Code = request.Code };
        // OutputItemId is required by the database: Apply sets it before the row is added
        Apply(recipe, request, items, skills);
        content.Add(recipe);
        AddIngredients(recipe, request, items);

        await editor.SaveAsync(ct);
        return ToDto(recipe, items, skills);
    }

    public async Task<CraftingRecipeDto> UpdateAsync(Guid versionId, Guid id, SaveCraftingRecipeRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var recipe = await FindAsync(versionId, id, ct);
        var items = await content.CodesAsync<Item>(versionId, ct);
        var skills = await content.CodesAsync<Skill>(versionId, ct);

        Apply(recipe, request, items, skills);
        foreach (var old in recipe.Ingredients.ToList())
            content.Remove(old);
        AddIngredients(recipe, request, items);

        await editor.SaveAsync(ct);
        return ToDto(recipe, items, skills);
    }

    public async Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        content.Remove(await FindAsync(versionId, id, ct));
        await editor.SaveAsync(ct);
    }

    private static void Apply(CraftingRecipe recipe, SaveCraftingRecipeRequest request, Dictionary<Guid, string> items, Dictionary<Guid, string> skills)
    {
        if (request.Ingredients.Count == 0)
            throw new ValidationException(nameof(request.Ingredients), "A recipe needs at least one ingredient.");

        var output = ContentReferences.Require(items, request.OutputItemCode, nameof(request.OutputItemCode));
        if (request.Ingredients.Any(i => i.ItemCode == request.OutputItemCode))
            throw new ValidationException(nameof(request.Ingredients), "A recipe cannot use its own output as an ingredient.");
        if (request.Ingredients.GroupBy(i => i.ItemCode).Any(g => g.Count() > 1))
            throw new ValidationException(nameof(request.Ingredients), "List each ingredient once and set its Quantity.");

        var hasSkill = !string.IsNullOrWhiteSpace(request.RequiredSkillCode);
        if (!hasSkill && request.RequiredSkillLevel > 0)
            throw new ValidationException(nameof(request.RequiredSkillLevel), "RequiredSkillLevel needs a RequiredSkillCode.");

        recipe.Name = request.Name.Trim();
        recipe.OutputItemId = output;
        recipe.OutputQuantity = request.OutputQuantity;
        recipe.CraftTimeSeconds = request.CraftTimeSeconds;
        recipe.RequiredSkillId = hasSkill ? ContentReferences.Require(skills, request.RequiredSkillCode, nameof(request.RequiredSkillCode)) : null;
        recipe.RequiredSkillLevel = hasSkill ? request.RequiredSkillLevel : 0;
        recipe.Station = request.Station.Trim();
    }

    private void AddIngredients(CraftingRecipe recipe, SaveCraftingRecipeRequest request, Dictionary<Guid, string> items)
    {
        for (var i = 0; i < request.Ingredients.Count; i++)
        {
            var ingredient = request.Ingredients[i];
            content.Add(new CraftingRecipeIngredient
            {
                RecipeId = recipe.Id,
                ItemId = ContentReferences.Require(items, ingredient.ItemCode, $"Ingredients[{i}].ItemCode"),
                Quantity = ingredient.Quantity
            });
        }
    }

    private async Task<CraftingRecipe> FindAsync(Guid versionId, Guid id, CancellationToken ct) =>
        await content.FindAsync<CraftingRecipe>(versionId, id, ct) ?? throw new NotFoundException("Recipe", id);

    private static CraftingRecipeDto ToDto(CraftingRecipe r, Dictionary<Guid, string> items, Dictionary<Guid, string> skills) => new(
        r.Id, r.Code, r.Name, ContentReferences.CodeOf(items, r.OutputItemId) ?? "", r.OutputQuantity, r.CraftTimeSeconds,
        ContentReferences.CodeOf(skills, r.RequiredSkillId), r.RequiredSkillLevel, r.Station,
        r.Ingredients.Select(i => new IngredientDto(ContentReferences.CodeOf(items, i.ItemId) ?? "", i.Quantity)).OrderBy(i => i.ItemCode).ToList(),
        r.UpdatedAt);
}

public class QuestService(IContentRepository content, ContentEditor editor) : IQuestService
{
    public async Task<IReadOnlyList<QuestDto>> GetAllAsync(Guid versionId, CancellationToken ct = default)
    {
        await editor.EnsureVersionExistsAsync(versionId, ct);
        var items = await content.CodesAsync<Item>(versionId, ct);
        return (await content.ListAsync<Quest>(versionId, ct)).OrderBy(q => q.SortOrder).ThenBy(q => q.Code).Select(q => ToDto(q, items)).ToList();
    }

    public async Task<QuestDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default) =>
        ToDto(await FindAsync(versionId, id, ct), await content.CodesAsync<Item>(versionId, ct));

    public async Task<QuestDto> CreateAsync(Guid versionId, CreateQuestRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var quests = await content.CodesAsync<Quest>(versionId, ct);
        ContentEditor.EnsureCodeFree(quests.Values, request.Code, "Quest");

        var items = await content.CodesAsync<Item>(versionId, ct);
        var quest = new Quest { ContentVersionId = versionId, Code = request.Code };
        Apply(quest, request, quests.Values.Append(request.Code).ToHashSet());
        content.Add(quest);
        AddRewards(quest, request, items);

        await editor.SaveAsync(ct);
        return ToDto(quest, items);
    }

    public async Task<QuestDto> UpdateAsync(Guid versionId, Guid id, SaveQuestRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var quest = await FindAsync(versionId, id, ct);
        var quests = await content.CodesAsync<Quest>(versionId, ct);
        var items = await content.CodesAsync<Item>(versionId, ct);

        Apply(quest, request, quests.Values.ToHashSet());
        foreach (var old in quest.Rewards.ToList())
            content.Remove(old);
        AddRewards(quest, request, items);

        await editor.SaveAsync(ct);
        return ToDto(quest, items);
    }

    public async Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var quest = await FindAsync(versionId, id, ct);
        ContentEditor.EnsureUnreferenced(await content.ReferencesToQuestAsync(versionId, quest.Code, ct), "Quest", quest.Code);

        content.Remove(quest);
        await editor.SaveAsync(ct);
    }

    private static void Apply(Quest quest, SaveQuestRequest request, HashSet<string> questCodes)
    {
        var objectives = ContentJson.Array(request.Objectives, nameof(request.Objectives));
        var list = JsonSerializer.Deserialize<JsonElement>(objectives).EnumerateArray().ToList();
        if (list.Count == 0)
            throw new ValidationException(nameof(request.Objectives), "A quest needs at least one objective.");
        if (list.Any(o => o.ValueKind != JsonValueKind.Object || !o.TryGetProperty("type", out _)))
            throw new ValidationException(nameof(request.Objectives), "Every objective must be an object with a 'type'.");

        var prerequisites = (request.Prerequisites ?? []).Select(p => p.Trim()).Where(p => p.Length > 0).Distinct().ToList();
        if (prerequisites.Contains(quest.Code))
            throw new ValidationException(nameof(request.Prerequisites), "A quest cannot be its own prerequisite.");
        var unknown = prerequisites.FirstOrDefault(p => !questCodes.Contains(p));
        if (unknown is not null)
            throw new ValidationException(nameof(request.Prerequisites), $"Quest '{unknown}' does not exist in this content version.");

        quest.Title = request.Title.Trim();
        quest.Description = request.Description?.Trim();
        quest.IsMain = request.IsMain;
        quest.SortOrder = request.SortOrder;
        quest.Objectives = objectives;
        quest.Prerequisites = prerequisites;
        quest.RewardXp = request.RewardXp;
    }

    private void AddRewards(Quest quest, SaveQuestRequest request, Dictionary<Guid, string> items)
    {
        var rewards = request.Rewards ?? [];
        for (var i = 0; i < rewards.Count; i++)
        {
            content.Add(new QuestReward
            {
                QuestId = quest.Id,
                ItemId = ContentReferences.Require(items, rewards[i].ItemCode, $"Rewards[{i}].ItemCode"),
                Quantity = rewards[i].Quantity
            });
        }
    }

    private async Task<Quest> FindAsync(Guid versionId, Guid id, CancellationToken ct) =>
        await content.FindAsync<Quest>(versionId, id, ct) ?? throw new NotFoundException("Quest", id);

    private static QuestDto ToDto(Quest q, Dictionary<Guid, string> items) => new(
        q.Id, q.Code, q.Title, q.Description, q.IsMain, q.SortOrder, ContentJson.ToElement(q.Objectives), q.Prerequisites, q.RewardXp,
        q.Rewards.Select(r => new QuestRewardDto(ContentReferences.CodeOf(items, r.ItemId) ?? "", r.Quantity)).OrderBy(r => r.ItemCode).ToList(),
        q.UpdatedAt);
}
