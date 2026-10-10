using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShadowVale.BLL.Constants;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.Interfaces;

namespace ShadowVale.API.Controllers;

// The content of one version, one controller per kind of row. All of them need Admin or Designer, and changes only work
// while the version is a Draft (or Rejected): any change clears the version's validation, so validate again before submitting.
// Rows refer to each other by code ("ammoItemCode"), and a code cannot change once created.

[ApiController]
[Route("api/content/versions/{versionId:guid}/items")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Designer}")]
public class ItemsController(IItemService items) : ControllerBase
{
    // Weapons and consumables are items with weapon / consumable stats
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ItemDto>>> GetAll(Guid versionId, [FromQuery] ItemQuery query, CancellationToken ct) =>
        Ok(await items.GetAllAsync(versionId, query, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ItemDto>> GetById(Guid versionId, Guid id, CancellationToken ct) =>
        Ok(await items.GetByIdAsync(versionId, id, ct));

    [HttpPost]
    public async Task<ActionResult<ItemDto>> Create(Guid versionId, CreateItemRequest request, CancellationToken ct)
    {
        var item = await items.CreateAsync(versionId, request, ct);
        return CreatedAtAction(nameof(GetById), new { versionId, id = item.Id }, item);
    }

    // The type of an item cannot change
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ItemDto>> Update(Guid versionId, Guid id, SaveItemRequest request, CancellationToken ct) =>
        Ok(await items.UpdateAsync(versionId, id, request, ct));

    // 409 while a loot table, recipe, quest, weapon or enemy still uses it
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid versionId, Guid id, CancellationToken ct)
    {
        await items.DeleteAsync(versionId, id, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/content/versions/{versionId:guid}/skills")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Designer}")]
public class SkillsController(ISkillService skills) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SkillDto>>> GetAll(Guid versionId, CancellationToken ct) =>
        Ok(await skills.GetAllAsync(versionId, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SkillDto>> GetById(Guid versionId, Guid id, CancellationToken ct) =>
        Ok(await skills.GetByIdAsync(versionId, id, ct));

    [HttpPost]
    public async Task<ActionResult<SkillDto>> Create(Guid versionId, CreateSkillRequest request, CancellationToken ct)
    {
        var skill = await skills.CreateAsync(versionId, request, ct);
        return CreatedAtAction(nameof(GetById), new { versionId, id = skill.Id }, skill);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SkillDto>> Update(Guid versionId, Guid id, SaveSkillRequest request, CancellationToken ct) =>
        Ok(await skills.UpdateAsync(versionId, id, request, ct));

    // 409 while a recipe requires it
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid versionId, Guid id, CancellationToken ct)
    {
        await skills.DeleteAsync(versionId, id, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/content/versions/{versionId:guid}/loot-tables")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Designer}")]
public class LootTablesController(ILootTableService lootTables) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<LootTableDto>>> GetAll(Guid versionId, CancellationToken ct) =>
        Ok(await lootTables.GetAllAsync(versionId, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LootTableDto>> GetById(Guid versionId, Guid id, CancellationToken ct) =>
        Ok(await lootTables.GetByIdAsync(versionId, id, ct));

    [HttpPost]
    public async Task<ActionResult<LootTableDto>> Create(Guid versionId, CreateLootTableRequest request, CancellationToken ct)
    {
        var table = await lootTables.CreateAsync(versionId, request, ct);
        return CreatedAtAction(nameof(GetById), new { versionId, id = table.Id }, table);
    }

    // The entries are replaced by the list in the request
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<LootTableDto>> Update(Guid versionId, Guid id, SaveLootTableRequest request, CancellationToken ct) =>
        Ok(await lootTables.UpdateAsync(versionId, id, request, ct));

    // 409 while an enemy type or a map uses it
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid versionId, Guid id, CancellationToken ct)
    {
        await lootTables.DeleteAsync(versionId, id, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/content/versions/{versionId:guid}/enemy-types")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Designer}")]
public class EnemyTypesController(IEnemyTypeService enemyTypes) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EnemyTypeDto>>> GetAll(Guid versionId, CancellationToken ct) =>
        Ok(await enemyTypes.GetAllAsync(versionId, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EnemyTypeDto>> GetById(Guid versionId, Guid id, CancellationToken ct) =>
        Ok(await enemyTypes.GetByIdAsync(versionId, id, ct));

    [HttpPost]
    public async Task<ActionResult<EnemyTypeDto>> Create(Guid versionId, CreateEnemyTypeRequest request, CancellationToken ct)
    {
        var enemy = await enemyTypes.CreateAsync(versionId, request, ct);
        return CreatedAtAction(nameof(GetById), new { versionId, id = enemy.Id }, enemy);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<EnemyTypeDto>> Update(Guid versionId, Guid id, SaveEnemyTypeRequest request, CancellationToken ct) =>
        Ok(await enemyTypes.UpdateAsync(versionId, id, request, ct));

    // 409 while a map places it
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid versionId, Guid id, CancellationToken ct)
    {
        await enemyTypes.DeleteAsync(versionId, id, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/content/versions/{versionId:guid}/maps")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Designer}")]
public class MapsController(IMapService maps) : ControllerBase
{
    // Summaries only; GET {id} has the nav graph, layout, enemy placements and containers
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MapSummaryDto>>> GetAll(Guid versionId, CancellationToken ct) =>
        Ok(await maps.GetAllAsync(versionId, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MapDto>> GetById(Guid versionId, Guid id, CancellationToken ct) =>
        Ok(await maps.GetByIdAsync(versionId, id, ct));

    [HttpPost]
    public async Task<ActionResult<MapDto>> Create(Guid versionId, CreateMapRequest request, CancellationToken ct)
    {
        var map = await maps.CreateAsync(versionId, request, ct);
        return CreatedAtAction(nameof(GetById), new { versionId, id = map.Id }, map);
    }

    // Enemy placements and container loot tables are replaced by the lists in the request
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MapDto>> Update(Guid versionId, Guid id, SaveMapRequest request, CancellationToken ct) =>
        Ok(await maps.UpdateAsync(versionId, id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid versionId, Guid id, CancellationToken ct)
    {
        await maps.DeleteAsync(versionId, id, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/content/versions/{versionId:guid}/recipes")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Designer}")]
public class CraftingRecipesController(ICraftingRecipeService recipes) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CraftingRecipeDto>>> GetAll(Guid versionId, CancellationToken ct) =>
        Ok(await recipes.GetAllAsync(versionId, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CraftingRecipeDto>> GetById(Guid versionId, Guid id, CancellationToken ct) =>
        Ok(await recipes.GetByIdAsync(versionId, id, ct));

    [HttpPost]
    public async Task<ActionResult<CraftingRecipeDto>> Create(Guid versionId, CreateCraftingRecipeRequest request, CancellationToken ct)
    {
        var recipe = await recipes.CreateAsync(versionId, request, ct);
        return CreatedAtAction(nameof(GetById), new { versionId, id = recipe.Id }, recipe);
    }

    // The ingredients are replaced by the list in the request
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CraftingRecipeDto>> Update(Guid versionId, Guid id, SaveCraftingRecipeRequest request, CancellationToken ct) =>
        Ok(await recipes.UpdateAsync(versionId, id, request, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid versionId, Guid id, CancellationToken ct)
    {
        await recipes.DeleteAsync(versionId, id, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/content/versions/{versionId:guid}/quests")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Designer}")]
public class QuestsController(IQuestService quests) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<QuestDto>>> GetAll(Guid versionId, CancellationToken ct) =>
        Ok(await quests.GetAllAsync(versionId, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<QuestDto>> GetById(Guid versionId, Guid id, CancellationToken ct) =>
        Ok(await quests.GetByIdAsync(versionId, id, ct));

    [HttpPost]
    public async Task<ActionResult<QuestDto>> Create(Guid versionId, CreateQuestRequest request, CancellationToken ct)
    {
        var quest = await quests.CreateAsync(versionId, request, ct);
        return CreatedAtAction(nameof(GetById), new { versionId, id = quest.Id }, quest);
    }

    // The rewards are replaced by the list in the request
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<QuestDto>> Update(Guid versionId, Guid id, SaveQuestRequest request, CancellationToken ct) =>
        Ok(await quests.UpdateAsync(versionId, id, request, ct));

    // 409 while another quest lists it as a prerequisite
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid versionId, Guid id, CancellationToken ct)
    {
        await quests.DeleteAsync(versionId, id, ct);
        return NoContent();
    }
}
