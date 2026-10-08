using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class TelemetryEventConfiguration : IEntityTypeConfiguration<TelemetryEvent>
{
    public void Configure(EntityTypeBuilder<TelemetryEvent> builder)
    {
        builder.Property(e => e.Id).UseIdentityAlwaysColumn();
        builder.Property(e => e.EventType).HasMaxLength(50);
        builder.Property(e => e.MapCode).HasMaxLength(64);
        builder.Property(e => e.Payload).IsJsonb();
        builder.Property(e => e.ReceivedAt).HasDefaultValueSql("now()");

        // A retried upload must not duplicate events
        builder.HasIndex(e => new { e.SessionId, e.ClientEventId }).IsUnique();
        builder.HasIndex(e => new { e.EventType, e.OccurredAt });
        builder.HasIndex(e => e.MapCode).HasFilter("map_code IS NOT NULL");
        // BRIN: tiny index for a column that only grows
        builder.HasIndex(e => e.OccurredAt).HasMethod("brin");

        builder.HasOne(e => e.Session).WithMany(s => s.Events).HasForeignKey(e => e.SessionId).OnDelete(DeleteBehavior.Cascade);
    }
}
