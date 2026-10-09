using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class ConsumableConfiguration : IEntityTypeConfiguration<Consumable>
{
    public void Configure(EntityTypeBuilder<Consumable> builder)
    {
        builder.Property(c => c.UseTimeSeconds).HasPrecision(5, 2);
        builder.Property(c => c.ExtraEffects).IsJsonb();

        builder.HasOne(c => c.Item)
            .WithOne(i => i.Consumable)
            .HasForeignKey<Consumable>(c => c.ItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("ck_consumables_heal_hp", "heal_hp >= 0");
            t.HasCheckConstraint("ck_consumables_restore_stamina", "restore_stamina >= 0");
            t.HasCheckConstraint("ck_consumables_use_time", "use_time_seconds >= 0");
        });
    }
}
