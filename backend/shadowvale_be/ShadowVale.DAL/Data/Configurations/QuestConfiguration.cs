using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class QuestConfiguration : ContentEntityConfiguration<Quest>
{
    protected override Expression<Func<ContentVersion, IEnumerable<Quest>?>> VersionCollection => v => v.Quests;

    protected override void ConfigureContent(EntityTypeBuilder<Quest> builder)
    {
        builder.Property(q => q.Title).HasMaxLength(200);
        builder.Property(q => q.Description).HasMaxLength(2000);
        builder.Property(q => q.Objectives).IsJsonb();

        builder.ToTable(t => t.HasCheckConstraint("ck_quests_reward_xp", "reward_xp >= 0"));
    }
}
