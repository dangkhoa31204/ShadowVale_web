using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class LootTableEntryConfiguration : IEntityTypeConfiguration<LootTableEntry>
{
    public void Configure(EntityTypeBuilder<LootTableEntry> builder)
    {
        builder.Property(e => e.Weight).HasPrecision(10, 4);
        builder.HasIndex(e => new { e.LootTableId, e.ItemId, e.Tier }).IsUnique();

        builder.HasOne(e => e.LootTable).WithMany(l => l.Entries).HasForeignKey(e => e.LootTableId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(e => e.Item).WithMany().HasForeignKey(e => e.ItemId).OnDelete(DeleteBehavior.Cascade);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("ck_loot_table_entries_tier", "tier BETWEEN 1 AND 5");
            t.HasCheckConstraint("ck_loot_table_entries_weight", "weight > 0");
            t.HasCheckConstraint("ck_loot_table_entries_quantity", "min_quantity >= 1 AND max_quantity >= min_quantity");
        });
    }
}
