namespace ShadowVale.DAL.Entities;

// Anything that fits in an inventory slot: weapons, ammo, bandages, crafting materials...
public class Item : ContentEntity
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public ItemType Type { get; set; }
    public ItemRarity Rarity { get; set; } = ItemRarity.Common;

    // Items per inventory slot (ammo stacking); weapons are always 1
    public int MaxStack { get; set; } = 1;
    public decimal Weight { get; set; }

    // Trade price at the Safe Camp
    public int BaseValue { get; set; }

    // Extra stats for tools / armor / quest items (jsonb), e.g. {"repairAmount": 50}
    public string Stats { get; set; } = "{}";
    public string? IconKey { get; set; }

    // Set only when Type is Weapon / Consumable
    public Weapon? Weapon { get; set; }
    public Consumable? Consumable { get; set; }
}
