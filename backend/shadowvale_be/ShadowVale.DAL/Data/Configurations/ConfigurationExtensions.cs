using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

internal static class ConfigurationExtensions
{
    // Enum stored as its name ("Weapon"), like User.Role
    public static PropertyBuilder<TEnum> IsEnumText<TEnum>(this PropertyBuilder<TEnum> property) where TEnum : struct, Enum
        => property.HasConversion<string>().HasMaxLength(30);

    public static PropertyBuilder<TEnum?> IsEnumText<TEnum>(this PropertyBuilder<TEnum?> property) where TEnum : struct, Enum
        => property.HasConversion<string>().HasMaxLength(30);

    // Free-form JSON the game reads as-is (stats, nav graph, FSM params...)
    public static PropertyBuilder<T> IsJsonb<T>(this PropertyBuilder<T> property) => property.HasColumnType("jsonb");
}

// Shared mapping for designer-authored content: Code is unique inside a version, and deleting a version deletes its content
public abstract class ContentEntityConfiguration<T> : IEntityTypeConfiguration<T> where T : ContentEntity
{
    protected abstract Expression<Func<ContentVersion, IEnumerable<T>?>> VersionCollection { get; }

    public void Configure(EntityTypeBuilder<T> builder)
    {
        builder.Property(e => e.Code).HasMaxLength(64);
        builder.HasIndex(e => new { e.ContentVersionId, e.Code }).IsUnique();

        builder.HasOne(e => e.ContentVersion)
            .WithMany(VersionCollection)
            .HasForeignKey(e => e.ContentVersionId)
            .OnDelete(DeleteBehavior.Cascade);

        ConfigureContent(builder);
    }

    protected abstract void ConfigureContent(EntityTypeBuilder<T> builder);
}
