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
        builder.HasIndex(s => s.StartedAt);

        // Keep the numbers when a player row is removed
        builder.HasOne(s => s.Player).WithMany(p => p.Sessions).HasForeignKey(s => s.PlayerId).OnDelete(DeleteBehavior.SetNull);
        // A version with recorded sessions cannot be deleted
        builder.HasOne(s => s.ContentVersion).WithMany().HasForeignKey(s => s.ContentVersionId).OnDelete(DeleteBehavior.Restrict);

        builder.ToTable(t => t.HasCheckConstraint("ck_game_sessions_ended_after_started", "ended_at IS NULL OR ended_at >= started_at"));
    }
}
