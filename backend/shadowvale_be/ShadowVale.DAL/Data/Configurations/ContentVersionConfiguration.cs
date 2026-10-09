using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class ContentVersionConfiguration : IEntityTypeConfiguration<ContentVersion>
{
    public void Configure(EntityTypeBuilder<ContentVersion> builder)
    {
        builder.Property(v => v.VersionNo).UseIdentityAlwaysColumn();
        builder.HasIndex(v => v.VersionNo).IsUnique();

        builder.Property(v => v.Label).HasMaxLength(200);
        builder.Property(v => v.SchemaVersion).HasMaxLength(20);
        builder.Property(v => v.Status).IsEnumText();
        builder.Property(v => v.Revision).IsConcurrencyToken();
        builder.Property(v => v.Bundle).IsJsonb();
        builder.Property(v => v.BundleChecksum).HasMaxLength(64);
        builder.Property(v => v.ValidationErrors).IsJsonb();
        builder.Property(v => v.ReviewNote).HasMaxLength(2000);

        builder.HasIndex(v => v.Status, "ix_content_versions_status")
            .HasDatabaseName("ix_content_versions_status");
        // At most one version is published at any time
        builder.HasIndex(v => v.Status, "ux_content_versions_one_published")
            .HasDatabaseName("ux_content_versions_one_published")
            .IsUnique()
            .HasFilter("status = 'Published'");

        builder.ToTable(t => t.HasCheckConstraint("ck_content_versions_published_has_bundle",
            "status NOT IN ('Published', 'Archived') OR (bundle IS NOT NULL AND bundle_checksum IS NOT NULL)"));

        builder.HasOne(v => v.ParentVersion)
            .WithMany()
            .HasForeignKey(v => v.ParentVersionId)
            .OnDelete(DeleteBehavior.SetNull);

        // Accounts are deactivated, never deleted, so authorship is kept
        builder.HasOne(v => v.AuthoredBy).WithMany().HasForeignKey(v => v.AuthoredById).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(v => v.ReviewedBy).WithMany().HasForeignKey(v => v.ReviewedById).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(v => v.PublishedBy).WithMany().HasForeignKey(v => v.PublishedById).OnDelete(DeleteBehavior.Restrict);
    }
}
