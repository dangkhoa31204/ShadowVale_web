namespace ShadowVale.DAL.Entities;

// Quest definition; a player's progress lives in the local save file
public class Quest : ContentEntity
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsMain { get; set; }
    public int SortOrder { get; set; }

    // kill X / collect Y / reach Z (jsonb array)
    public string Objectives { get; set; } = "[]";

    // Codes of quests that must be completed first
    public List<string> Prerequisites { get; set; } = [];
    public int RewardXp { get; set; }

    public ICollection<QuestReward> Rewards { get; set; } = [];
}
