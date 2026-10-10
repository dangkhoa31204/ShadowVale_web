using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class GameSessionConfiguration : IEntityTypeConfiguration<GameSession>
{
    public void Configure(EntityTypeBuilder<GameSession> builder)
    {
        builder.Property(s => s.Outcome).IsEnumText();
        builder.Property(s => s.ClientVersion).HasMaxLength(50);
        builder.Property(s => s.Platform).HasMaxLength(20);
        builder.Property(s => s.MapCode).HasMaxLength(64);
        builder.Property(s => s.Stats).IsJsonb().HasDefaultValueSql("'{}'::jsonb");
        builder.Property(s => s.Source)
            .HasConversion(v => v.ToString().ToLowerInvariant(), v => Enum.Parse<SessionSource>(v, true))
            .HasMaxLength(10)
            .HasDefaultValue(SessionSource.Human)
            .HasSentinel((SessionSource)(-1));
        builder.HasIndex(s => s.StartedAt);
        builder.HasIndex(s => s.Source);
        builder.HasIndex(s => s.MapCode);

        // Keep the numbers when a player row is removed
        builder.HasOne(s => s.Player).WithMany(p => p.Sessions).HasForeignKey(s => s.PlayerId).OnDelete(DeleteBehavior.SetNull);
        // A version or solver configuration with recorded sessions cannot be deleted
        builder.HasOne(s => s.ContentVersion).WithMany().HasForeignKey(s => s.ContentVersionId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(s => s.SolverConfiguration).WithMany().HasForeignKey(s => s.SolverConfigurationId).OnDelete(DeleteBehavior.Restrict);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("ck_game_sessions_ended_after_started", "ended_at IS NULL OR ended_at >= started_at");
            t.HasCheckConstraint("ck_game_sessions_source", "source IN ('human', 'replay')");
        });
    }
}
