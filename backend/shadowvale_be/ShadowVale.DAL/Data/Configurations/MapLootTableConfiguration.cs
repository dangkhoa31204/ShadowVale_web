using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class MapLootTableConfiguration : IEntityTypeConfiguration<MapLootTable>
{
    public void Configure(EntityTypeBuilder<MapLootTable> builder)
    {
        builder.Property(m => m.ContainerTag).HasMaxLength(50);
        builder.HasIndex(m => new { m.MapId, m.LootTableId, m.ContainerTag }).IsUnique();

        builder.HasOne(m => m.Map).WithMany(map => map.LootTables).HasForeignKey(m => m.MapId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(m => m.LootTable).WithMany().HasForeignKey(m => m.LootTableId).OnDelete(DeleteBehavior.Cascade);
    }
}
