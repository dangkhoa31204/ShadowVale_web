using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class EnemyPlacementConfiguration : IEntityTypeConfiguration<EnemyPlacement>
{
    public void Configure(EntityTypeBuilder<EnemyPlacement> builder)
    {
        builder.Property(p => p.SquadTag).HasMaxLength(50);
        builder.Property(p => p.PosX).HasPrecision(9, 3);
        builder.Property(p => p.PosY).HasPrecision(9, 3);
        builder.Property(p => p.FacingDegrees).HasPrecision(5, 2);
        builder.Property(p => p.PatrolRoute).IsJsonb();
        builder.Property(p => p.SpawnCondition).IsJsonb();

        builder.HasOne(p => p.Map).WithMany(m => m.EnemyPlacements).HasForeignKey(p => p.MapId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(p => p.EnemyType).WithMany().HasForeignKey(p => p.EnemyTypeId).OnDelete(DeleteBehavior.Cascade);
    }
}
