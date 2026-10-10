using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace ShadowVale.BLL.DTOs.Content;

// Code is the stable name of a row inside a version ("rifle_ak", "map_01"): the game and the bundle refer to rows by it,
// and two versions are compared by it. It is chosen at creation and cannot change. Rows refer to each other by code.
public static class ContentCode
{
    public const string Pattern = "^[a-z][a-z0-9_]*$";
    public const string Message = "Code must start with a letter and contain only lowercase letters, digits and '_'.";
}

// ---------- Items (weapons and consumables are items with extra stats) ----------

public sealed record WeaponDto(
    string Class, decimal Damage, decimal FireRate, decimal EffectiveRange, int? MagazineSize, decimal? ReloadTimeSeconds,
    string? AmmoItemCode, int MaxDurability, decimal DurabilityPerUse, decimal NoiseRadius, bool IsSuppressed);

public sealed record ConsumableDto(int HealHp, int RestoreStamina, decimal UseTimeSeconds, IReadOnlyList<string> Cures, JsonElement ExtraEffects);

public sealed record ItemDto(
    Guid Id, string Code, string Name, string? Description, string Type, string Rarity, int MaxStack, decimal Weight, int BaseValue,
    JsonElement Stats, string? IconKey, WeaponDto? Weapon, ConsumableDto? Consumable, DateTime UpdatedAt);

public sealed record ItemQuery
{
    public string? Type { get; init; }
    public string? Rarity { get; init; }
    public string? Search { get; init; }
}

public sealed record WeaponRequest
{
    [Required] public string Class { get; init; } = "";
    [Range(0.01, 99999)] public decimal Damage { get; init; }
    // Shots (or swings) per second
    [Range(0.01, 9999)] public decimal FireRate { get; init; }
    [Range(0, 9999)] public decimal EffectiveRange { get; init; }
    [Range(1, 10_000)] public int? MagazineSize { get; init; }
    [Range(0, 999)] public decimal? ReloadTimeSeconds { get; init; }
    // Code of an item of type Ammo
    public string? AmmoItemCode { get; init; }
    [Range(1, 1_000_000)] public int MaxDurability { get; init; } = 100;
    [Range(0, 1000)] public decimal DurabilityPerUse { get; init; } = 1;
    [Range(0, 9999)] public decimal NoiseRadius { get; init; }
    public bool IsSuppressed { get; init; }
}

public sealed record ConsumableRequest
{
    [Range(0, 100_000)] public int HealHp { get; init; }
    [Range(0, 100_000)] public int RestoreStamina { get; init; }
    [Range(0, 999)] public decimal UseTimeSeconds { get; init; }
    public List<string>? Cures { get; init; }
    public JsonElement? ExtraEffects { get; init; }
}

public record SaveItemRequest
{
    [Required, MaxLength(100)] public string Name { get; init; } = "";
    [MaxLength(1000)] public string? Description { get; init; }
    [Required] public string Type { get; init; } = "";
    public string? Rarity { get; init; }
    [Range(1, 100_000)] public int MaxStack { get; init; } = 1;
    [Range(0, 9999.99)] public decimal Weight { get; init; }
    [Range(0, 100_000_000)] public int BaseValue { get; init; }
    public JsonElement? Stats { get; init; }
    [MaxLength(200)] public string? IconKey { get; init; }
    // Required when Type is Weapon, not allowed otherwise
    public WeaponRequest? Weapon { get; init; }
    // Required when Type is Consumable, not allowed otherwise
    public ConsumableRequest? Consumable { get; init; }
}

public sealed record CreateItemRequest : SaveItemRequest
{
    [Required, MaxLength(64), RegularExpression(ContentCode.Pattern, ErrorMessage = ContentCode.Message)]
    public string Code { get; init; } = "";
}

// ---------- Skills ----------

public sealed record SkillDto(Guid Id, string Code, string Name, string Type, int MaxLevel, JsonElement XpCurve, JsonElement Effects, DateTime UpdatedAt);

public record SaveSkillRequest
{
    [Required, MaxLength(100)] public string Name { get; init; } = "";
    [Required] public string Type { get; init; } = "";
    [Range(1, 100)] public int MaxLevel { get; init; } = 10;
    // XP needed per level, e.g. [100, 250, 500]
    public JsonElement? XpCurve { get; init; }
    public JsonElement? Effects { get; init; }
}

public sealed record CreateSkillRequest : SaveSkillRequest
{
    [Required, MaxLength(64), RegularExpression(ContentCode.Pattern, ErrorMessage = ContentCode.Message)]
    public string Code { get; init; } = "";
}

// ---------- Loot tables ----------

public sealed record LootEntryDto(string ItemCode, short Tier, decimal Weight, int MinQuantity, int MaxQuantity);

public sealed record LootTableDto(Guid Id, string Code, string Name, int RollsMin, int RollsMax, IReadOnlyList<LootEntryDto> Entries, DateTime UpdatedAt);

public sealed record LootEntryRequest
{
    [Required] public string ItemCode { get; init; } = "";
    [Range(1, 10)] public short Tier { get; init; } = 1;
    // Chance of the drop = Weight / sum of the weights in the same tier
    [Range(0.0001, 1_000_000)] public decimal Weight { get; init; }
    [Range(1, 100_000)] public int MinQuantity { get; init; } = 1;
    [Range(1, 100_000)] public int MaxQuantity { get; init; } = 1;
}

public record SaveLootTableRequest
{
    [Required, MaxLength(100)] public string Name { get; init; } = "";
    [Range(0, 100)] public int RollsMin { get; init; } = 1;
    [Range(0, 100)] public int RollsMax { get; init; } = 1;
    [Required] public List<LootEntryRequest> Entries { get; init; } = [];
}

public sealed record CreateLootTableRequest : SaveLootTableRequest
{
    [Required, MaxLength(64), RegularExpression(ContentCode.Pattern, ErrorMessage = ContentCode.Message)]
    public string Code { get; init; } = "";
}

// ---------- Enemy types ----------

public sealed record EnemyTypeDto(
    Guid Id, string Code, string Name, string Archetype, bool IsBoss, int MaxHp, decimal MoveSpeed, decimal VisionRange,
    decimal VisionAngleDegrees, decimal HearingRange, decimal Accuracy, string? WeaponItemCode, string? LootTableCode,
    JsonElement FsmParams, DateTime UpdatedAt);

public record SaveEnemyTypeRequest
{
    [Required, MaxLength(100)] public string Name { get; init; } = "";
    // rifleman / sniper / grenadier / boss...
    [Required, MaxLength(50)] public string Archetype { get; init; } = "";
    public bool IsBoss { get; init; }
    [Range(1, 1_000_000)] public int MaxHp { get; init; }
    [Range(0, 100)] public decimal MoveSpeed { get; init; } = 3.5m;
    [Range(0, 1000)] public decimal VisionRange { get; init; } = 15;
    [Range(1, 360)] public decimal VisionAngleDegrees { get; init; } = 90;
    [Range(0, 1000)] public decimal HearingRange { get; init; } = 10;
    // 0..1
    [Range(0, 1)] public decimal Accuracy { get; init; } = 0.5m;
    // Code of an item of type Weapon
    public string? WeaponItemCode { get; init; }
    public string? LootTableCode { get; init; }
    // State thresholds of the FSM (and boss abilities), merged into the enemy's entry in the bundle
    public JsonElement? FsmParams { get; init; }
}

public sealed record CreateEnemyTypeRequest : SaveEnemyTypeRequest
{
    [Required, MaxLength(64), RegularExpression(ContentCode.Pattern, ErrorMessage = ContentCode.Message)]
    public string Code { get; init; } = "";
}

// ---------- Maps ----------

public sealed record EnemyPlacementDto(
    string EnemyTypeCode, string SquadTag, decimal PosX, decimal PosY, decimal FacingDegrees, JsonElement PatrolRoute, JsonElement? SpawnCondition);

public sealed record MapLootTableDto(string LootTableCode, string ContainerTag);

public sealed record MapDto(
    Guid Id, string Code, string Name, string SceneKey, bool IsSafeCamp, int SortOrder, JsonElement NavGraph, JsonElement Layout,
    IReadOnlyList<EnemyPlacementDto> EnemyPlacements, IReadOnlyList<MapLootTableDto> LootTables, DateTime UpdatedAt);

// The list leaves out the nav graph and layout, which can be large
public sealed record MapSummaryDto(
    Guid Id, string Code, string Name, string SceneKey, bool IsSafeCamp, int SortOrder, int EnemyCount, int LootTableCount, DateTime UpdatedAt);

public sealed record EnemyPlacementRequest
{
    [Required] public string EnemyTypeCode { get; init; } = "";
    // Enemies with the same tag are coordinated as one squad
    [Required, MaxLength(50)] public string SquadTag { get; init; } = "squad_1";
    public decimal PosX { get; init; }
    public decimal PosY { get; init; }
    [Range(0, 360)] public decimal FacingDegrees { get; init; }
    // Array of waypoints for the Patrol state
    public JsonElement? PatrolRoute { get; init; }
    public JsonElement? SpawnCondition { get; init; }
}

public sealed record MapLootTableRequest
{
    [Required] public string LootTableCode { get; init; } = "";
    // crate / locker / body...
    [Required, MaxLength(50)] public string ContainerTag { get; init; } = "default";
}

public record SaveMapRequest
{
    [Required, MaxLength(100)] public string Name { get; init; } = "";
    // Unity scene to load
    [Required, MaxLength(100)] public string SceneKey { get; init; } = "";
    // The Safe Camp hub: exactly one map per version
    public bool IsSafeCamp { get; init; }
    public int SortOrder { get; init; }
    // { "nodes": [ { "id": 0, "x": 0, "y": 0, "z": 0, "is_cover": false, "cover_facing": 0, "neighbors": [1, 2] } ] }
    public JsonElement? NavGraph { get; init; }
    public JsonElement? Layout { get; init; }
    public List<EnemyPlacementRequest>? EnemyPlacements { get; init; }
    public List<MapLootTableRequest>? LootTables { get; init; }
}

public sealed record CreateMapRequest : SaveMapRequest
{
    [Required, MaxLength(64), RegularExpression(ContentCode.Pattern, ErrorMessage = ContentCode.Message)]
    public string Code { get; init; } = "";
}

// ---------- Crafting recipes ----------

public sealed record IngredientDto(string ItemCode, int Quantity);

public sealed record CraftingRecipeDto(
    Guid Id, string Code, string Name, string OutputItemCode, int OutputQuantity, decimal CraftTimeSeconds,
    string? RequiredSkillCode, int RequiredSkillLevel, string Station, IReadOnlyList<IngredientDto> Ingredients, DateTime UpdatedAt);

public sealed record IngredientRequest
{
    [Required] public string ItemCode { get; init; } = "";
    [Range(1, 100_000)] public int Quantity { get; init; } = 1;
}

public record SaveCraftingRecipeRequest
{
    [Required, MaxLength(100)] public string Name { get; init; } = "";
    [Required] public string OutputItemCode { get; init; } = "";
    [Range(1, 100_000)] public int OutputQuantity { get; init; } = 1;
    [Range(0, 9999)] public decimal CraftTimeSeconds { get; init; }
    // Null = no skill needed
    public string? RequiredSkillCode { get; init; }
    [Range(0, 100)] public int RequiredSkillLevel { get; init; }
    // workbench (Safe Camp) / field...
    [Required, MaxLength(50)] public string Station { get; init; } = "workbench";
    [Required] public List<IngredientRequest> Ingredients { get; init; } = [];
}

public sealed record CreateCraftingRecipeRequest : SaveCraftingRecipeRequest
{
    [Required, MaxLength(64), RegularExpression(ContentCode.Pattern, ErrorMessage = ContentCode.Message)]
    public string Code { get; init; } = "";
}

// ---------- Quests ----------

public sealed record QuestRewardDto(string ItemCode, int Quantity);

public sealed record QuestDto(
    Guid Id, string Code, string Title, string? Description, bool IsMain, int SortOrder, JsonElement Objectives,
    IReadOnlyList<string> Prerequisites, int RewardXp, IReadOnlyList<QuestRewardDto> Rewards, DateTime UpdatedAt);

public sealed record QuestRewardRequest
{
    [Required] public string ItemCode { get; init; } = "";
    [Range(1, 100_000)] public int Quantity { get; init; } = 1;
}

public record SaveQuestRequest
{
    [Required, MaxLength(200)] public string Title { get; init; } = "";
    [MaxLength(2000)] public string? Description { get; init; }
    public bool IsMain { get; init; }
    public int SortOrder { get; init; }
    // Array of objectives (kill X / collect Y / reach Z), each an object with at least a "type"
    public JsonElement? Objectives { get; init; }
    // Codes of quests that must be completed first
    public List<string>? Prerequisites { get; init; }
    [Range(0, 10_000_000)] public int RewardXp { get; init; }
    public List<QuestRewardRequest>? Rewards { get; init; }
}

public sealed record CreateQuestRequest : SaveQuestRequest
{
    [Required, MaxLength(64), RegularExpression(ContentCode.Pattern, ErrorMessage = ContentCode.Message)]
    public string Code { get; init; } = "";
}
