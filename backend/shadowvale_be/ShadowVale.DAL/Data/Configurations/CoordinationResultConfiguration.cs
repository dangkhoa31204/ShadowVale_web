using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class CoordinationResultConfiguration : IEntityTypeConfiguration<CoordinationResult>
{
    public void Configure(EntityTypeBuilder<CoordinationResult> builder)
    {
        builder.Property(r => r.MapCode).HasMaxLength(64);
        builder.Property(r => r.SquadTag).HasMaxLength(50);
        builder.Property(r => r.TaskType).IsEnumText();
        builder.Property(r => r.EncounterOutcome).IsEnumText();
        builder.Property(r => r.Assignment).IsJsonb();

        builder.HasOne(r => r.Session).WithMany(s => s.CoordinationResults).HasForeignKey(r => r.SessionId).OnDelete(DeleteBehavior.Cascade);
        // A solver configuration with recorded results cannot be deleted (deactivate it instead)
        builder.HasOne(r => r.SolverConfiguration).WithMany().HasForeignKey(r => r.SolverConfigurationId).OnDelete(DeleteBehavior.Restrict);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("ck_coordination_results_num_agents", "num_agents > 0");
            t.HasCheckConstraint("ck_coordination_results_num_nodes", "num_nodes > 0");
            t.HasCheckConstraint("ck_coordination_results_latency", "solve_latency_ms >= 0");
        });
    }
}
