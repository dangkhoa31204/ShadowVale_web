using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class ItemConfiguration : ContentEntityConfiguration<Item>
{
    protected override Expression<Func<ContentVersion, IEnumerable<Item>?>> VersionCollection => v => v.Items;

    protected override void ConfigureContent(EntityTypeBuilder<Item> builder)
    {
        builder.Property(i => i.Name).HasMaxLength(100);
        builder.Property(i => i.Description).HasMaxLength(1000);
        builder.Property(i => i.Type).IsEnumText();
        builder.Property(i => i.Rarity).IsEnumText();
        builder.Property(i => i.Weight).HasPrecision(6, 2);
        builder.Property(i => i.Stats).IsJsonb();
        builder.Property(i => i.IconKey).HasMaxLength(200);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("ck_items_max_stack", "max_stack >= 1");
            t.HasCheckConstraint("ck_items_weight", "weight >= 0");
            t.HasCheckConstraint("ck_items_base_value", "base_value >= 0");
            t.HasCheckConstraint("ck_items_weapon_not_stackable", "type <> 'Weapon' OR max_stack = 1");
        });
    }
}
