namespace ShadowVale.DAL.Entities;

// Which loot table fills which kind of container on a map
public class MapLootTable : BaseEntity
{
    public Guid MapId { get; set; }
    public Map Map { get; set; } = null!;

    public Guid LootTableId { get; set; }
    public LootTable LootTable { get; set; } = null!;

    // crate / locker / body...
    public string ContainerTag { get; set; } = "default";
}
