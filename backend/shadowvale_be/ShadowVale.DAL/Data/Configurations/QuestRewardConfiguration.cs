using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class QuestRewardConfiguration : IEntityTypeConfiguration<QuestReward>
{
    public void Configure(EntityTypeBuilder<QuestReward> builder)
    {
        builder.HasIndex(r => new { r.QuestId, r.ItemId }).IsUnique();

        builder.HasOne(r => r.Quest).WithMany(q => q.Rewards).HasForeignKey(r => r.QuestId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(r => r.Item).WithMany().HasForeignKey(r => r.ItemId).OnDelete(DeleteBehavior.Cascade);

        builder.ToTable(t => t.HasCheckConstraint("ck_quest_rewards_quantity", "quantity > 0"));
    }
}
