using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class EnemyTypeConfiguration : ContentEntityConfiguration<EnemyType>
{
    protected override Expression<Func<ContentVersion, IEnumerable<EnemyType>?>> VersionCollection => v => v.EnemyTypes;

    protected override void ConfigureContent(EntityTypeBuilder<EnemyType> builder)
    {
        builder.Property(e => e.Name).HasMaxLength(100);
        builder.Property(e => e.Archetype).HasMaxLength(50);
        builder.Property(e => e.MoveSpeed).HasPrecision(5, 2);
        builder.Property(e => e.VisionRange).HasPrecision(6, 2);
        builder.Property(e => e.VisionAngleDegrees).HasPrecision(5, 2);
        builder.Property(e => e.HearingRange).HasPrecision(6, 2);
        builder.Property(e => e.Accuracy).HasPrecision(4, 3);
        builder.Property(e => e.FsmParams).IsJsonb();

        builder.HasOne(e => e.Weapon).WithMany().HasForeignKey(e => e.WeaponId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(e => e.LootTable).WithMany().HasForeignKey(e => e.LootTableId).OnDelete(DeleteBehavior.SetNull);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("ck_enemy_types_max_hp", "max_hp > 0");
            t.HasCheckConstraint("ck_enemy_types_move_speed", "move_speed > 0");
            t.HasCheckConstraint("ck_enemy_types_vision_angle", "vision_angle_degrees BETWEEN 0 AND 360");
            t.HasCheckConstraint("ck_enemy_types_accuracy", "accuracy BETWEEN 0 AND 1");
        });
    }
}
