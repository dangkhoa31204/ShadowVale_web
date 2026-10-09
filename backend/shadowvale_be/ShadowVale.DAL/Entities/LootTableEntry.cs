namespace ShadowVale.DAL.Entities;

// One possible drop: chance = Weight / sum of Weight in the same table and tier
public class LootTableEntry : BaseEntity
{
    public Guid LootTableId { get; set; }
    public LootTable LootTable { get; set; } = null!;

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public short Tier { get; set; } = 1;
    public decimal Weight { get; set; }
    public int MinQuantity { get; set; } = 1;
    public int MaxQuantity { get; set; } = 1;
}
