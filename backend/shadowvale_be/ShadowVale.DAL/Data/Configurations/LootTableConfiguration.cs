using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class LootTableConfiguration : ContentEntityConfiguration<LootTable>
{
    protected override Expression<Func<ContentVersion, IEnumerable<LootTable>?>> VersionCollection => v => v.LootTables;

    protected override void ConfigureContent(EntityTypeBuilder<LootTable> builder)
    {
        builder.Property(l => l.Name).HasMaxLength(100);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("ck_loot_tables_rolls_min", "rolls_min >= 0");
            t.HasCheckConstraint("ck_loot_tables_rolls_range", "rolls_max >= rolls_min");
        });
    }
}
