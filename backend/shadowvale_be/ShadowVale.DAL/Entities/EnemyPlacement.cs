namespace ShadowVale.DAL.Entities;

// One enemy spawned on a map
public class EnemyPlacement : BaseEntity
{
    public Guid MapId { get; set; }
    public Map Map { get; set; } = null!;

    public Guid EnemyTypeId { get; set; }
    public EnemyType EnemyType { get; set; } = null!;

    // Enemies with the same tag are coordinated together as one squad
    public string SquadTag { get; set; } = "squad_1";
    public decimal PosX { get; set; }
    public decimal PosY { get; set; }
    public decimal FacingDegrees { get; set; }

    // Waypoints for the Patrol state (jsonb array)
    public string PatrolRoute { get; set; } = "[]";

    // e.g. only when the boss calls reinforcements (jsonb)
    public string? SpawnCondition { get; set; }
}
