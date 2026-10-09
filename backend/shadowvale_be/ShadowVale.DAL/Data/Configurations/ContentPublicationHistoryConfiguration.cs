using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class ContentPublicationHistoryConfiguration : IEntityTypeConfiguration<ContentPublicationHistory>
{
    public void Configure(EntityTypeBuilder<ContentPublicationHistory> builder)
    {
        builder.ToTable("content_publication_history");
        builder.Property(h => h.Action).IsEnumText();
        builder.Property(h => h.Reason).HasMaxLength(500);
        builder.HasIndex(h => h.CreatedAt);

        // A version that was ever published cannot be deleted: the history still points at it
        builder.HasOne(h => h.ContentVersion).WithMany().HasForeignKey(h => h.ContentVersionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(h => h.PreviousVersion).WithMany().HasForeignKey(h => h.PreviousVersionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(h => h.Actor).WithMany().HasForeignKey(h => h.ActorId).OnDelete(DeleteBehavior.Restrict);
    }
}
