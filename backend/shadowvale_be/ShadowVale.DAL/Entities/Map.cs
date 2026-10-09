namespace ShadowVale.DAL.Entities;

public class Map : ContentEntity
{
    public string Name { get; set; } = null!;

    // Unity scene to load
    public string SceneKey { get; set; } = null!;

    // The Safe Camp hub (exactly one per version)
    public bool IsSafeCamp { get; set; }
    public int SortOrder { get; set; }

    // Navigation graph used by the QUBO squad coordinator: nodes, edges, cover points (jsonb)
    public string NavGraph { get; set; } = "{}";

    // Other layout data: player spawn, safe zones... (jsonb)
    public string Layout { get; set; } = "{}";

    public ICollection<EnemyPlacement> EnemyPlacements { get; set; } = [];
    public ICollection<MapLootTable> LootTables { get; set; } = [];
}
