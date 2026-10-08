namespace ShadowVale.DAL.Entities;

// Effect of an Item of type Consumable: bandage, medkit, food...
public class Consumable : BaseEntity
{
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public int HealHp { get; set; }
    public int RestoreStamina { get; set; }
    public decimal UseTimeSeconds { get; set; }

    // Status effects removed, e.g. ["bleeding"]
    public List<string> Cures { get; set; } = [];

    // Temporary buffs (jsonb)
    public string ExtraEffects { get; set; } = "{}";
}
