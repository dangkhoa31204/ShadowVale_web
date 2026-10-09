using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class WeaponConfiguration : IEntityTypeConfiguration<Weapon>
{
    public void Configure(EntityTypeBuilder<Weapon> builder)
    {
        builder.Property(w => w.Class).IsEnumText();
        builder.Property(w => w.Damage).HasPrecision(7, 2);
        builder.Property(w => w.FireRate).HasPrecision(6, 2);
        builder.Property(w => w.EffectiveRange).HasPrecision(6, 2);
        builder.Property(w => w.ReloadTimeSeconds).HasPrecision(5, 2);
        builder.Property(w => w.DurabilityPerUse).HasPrecision(6, 3);
        builder.Property(w => w.NoiseRadius).HasPrecision(6, 2);

        builder.HasOne(w => w.Item)
            .WithOne(i => i.Weapon)
            .HasForeignKey<Weapon>(w => w.ItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.AmmoItem)
            .WithMany()
            .HasForeignKey(w => w.AmmoItemId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("ck_weapons_damage", "damage > 0");
            t.HasCheckConstraint("ck_weapons_fire_rate", "fire_rate > 0");
            t.HasCheckConstraint("ck_weapons_effective_range", "effective_range >= 0");
            t.HasCheckConstraint("ck_weapons_magazine_size", "magazine_size IS NULL OR magazine_size >= 1");
            t.HasCheckConstraint("ck_weapons_max_durability", "max_durability > 0");
            t.HasCheckConstraint("ck_weapons_noise_radius", "noise_radius >= 0");
            t.HasCheckConstraint("ck_weapons_melee_no_ammo", "class <> 'Melee' OR (ammo_item_id IS NULL AND magazine_size IS NULL)");
        });
    }
}
