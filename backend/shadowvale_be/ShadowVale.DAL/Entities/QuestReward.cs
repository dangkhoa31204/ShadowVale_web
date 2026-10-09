namespace ShadowVale.DAL.Entities;

public class QuestReward : BaseEntity
{
    public Guid QuestId { get; set; }
    public Quest Quest { get; set; } = null!;

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public int Quantity { get; set; } = 1;
}
