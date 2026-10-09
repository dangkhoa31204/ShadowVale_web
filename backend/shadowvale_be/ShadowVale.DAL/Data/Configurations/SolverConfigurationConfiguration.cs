using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class SolverConfigurationConfiguration : IEntityTypeConfiguration<SolverConfiguration>
{
    public void Configure(EntityTypeBuilder<SolverConfiguration> builder)
    {
        builder.Property(s => s.Code).HasMaxLength(64);
        builder.HasIndex(s => s.Code).IsUnique();
        builder.Property(s => s.Name).HasMaxLength(100);
        builder.Property(s => s.Algorithm).IsEnumText();
        builder.Property(s => s.Family).IsEnumText();
        builder.Property(s => s.Library).HasMaxLength(50);
        builder.Property(s => s.Params).IsJsonb();
        builder.Property(s => s.QuboWeights).IsJsonb();

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("ck_solver_configurations_time_budget", "time_budget_ms > 0");
            // Family must match the algorithm, so the classical vs quantum-inspired comparison cannot be mislabelled
            t.HasCheckConstraint("ck_solver_configurations_family",
                "(family = 'Classical') = (algorithm IN ('Greedy', 'Genetic', 'ClassicalSa')) " +
                "AND (family = 'QuantumHardware') = (algorithm = 'QpuDwave')");
        });
    }
}
