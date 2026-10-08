using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class MapConfiguration : ContentEntityConfiguration<Map>
{
    protected override Expression<Func<ContentVersion, IEnumerable<Map>?>> VersionCollection => v => v.Maps;

    protected override void ConfigureContent(EntityTypeBuilder<Map> builder)
    {
        builder.Property(m => m.Name).HasMaxLength(100);
        builder.Property(m => m.SceneKey).HasMaxLength(100);
        builder.Property(m => m.NavGraph).IsJsonb();
        builder.Property(m => m.Layout).IsJsonb();
    }
}
