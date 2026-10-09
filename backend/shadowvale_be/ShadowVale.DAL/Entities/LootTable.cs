namespace ShadowVale.DAL.Entities;

public class LootTable : ContentEntity
{
    public string Name { get; set; } = null!;
    public int RollsMin { get; set; } = 1;
    public int RollsMax { get; set; } = 1;

    public ICollection<LootTableEntry> Entries { get; set; } = [];
}
