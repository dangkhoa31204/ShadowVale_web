namespace ShadowVale.DAL.Entities;

// Skill definition; a player's level lives in the local save file
public class Skill : ContentEntity
{
    public string Name { get; set; } = null!;
    public SkillType Type { get; set; }
    public int MaxLevel { get; set; } = 10;

    // XP needed per level (jsonb array), e.g. [100, 250, 500]
    public string XpCurve { get; set; } = "[]";

    // Per-level bonuses (jsonb)
    public string Effects { get; set; } = "{}";
}
