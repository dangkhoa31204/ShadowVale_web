namespace ShadowVale.DAL.Entities;

// Weapon stats for an Item of type Weapon (one row per weapon item)
public class Weapon : BaseEntity
{
    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public WeaponClass Class { get; set; }
    public decimal Damage { get; set; }

    // Shots per second (swings per second for melee)
    public decimal FireRate { get; set; }
    public decimal EffectiveRange { get; set; }

    // Null for melee
    public int? MagazineSize { get; set; }
    public decimal? ReloadTimeSeconds { get; set; }
    public Guid? AmmoItemId { get; set; }
    public Item? AmmoItem { get; set; }

    public int MaxDurability { get; set; }
    public decimal DurabilityPerUse { get; set; } = 1;

    // How far enemies hear the shot (stealth)
    public decimal NoiseRadius { get; set; }
    public bool IsSuppressed { get; set; }
}
