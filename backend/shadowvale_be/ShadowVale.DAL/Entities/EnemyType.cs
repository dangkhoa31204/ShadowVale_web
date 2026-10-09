namespace ShadowVale.DAL.Entities;

// Enemy archetype and its FSM parameters (Patrol -> Investigate -> Spot -> Cover -> Engage -> Retreat)
public class EnemyType : ContentEntity
{
    public string Name { get; set; } = null!;

    // rifleman / sniper / grenadier / boss...
    public string Archetype { get; set; } = null!;

    // Boss abilities (relocate, grenades, call reinforcements below 50% HP) go in FsmParams
    public bool IsBoss { get; set; }
    public int MaxHp { get; set; }
    public decimal MoveSpeed { get; set; } = 3.5m;
    public decimal VisionRange { get; set; } = 15;
    public decimal VisionAngleDegrees { get; set; } = 90;
    public decimal HearingRange { get; set; } = 10;

    // 0..1
    public decimal Accuracy { get; set; } = 0.5m;

    // Damage, fire rate and noise come from the weapon
    public Guid? WeaponId { get; set; }
    public Weapon? Weapon { get; set; }

    // State thresholds (jsonb)
    public string FsmParams { get; set; } = "{}";

    public Guid? LootTableId { get; set; }
    public LootTable? LootTable { get; set; }
}
