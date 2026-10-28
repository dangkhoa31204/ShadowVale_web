using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShadowVale.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddTabuSolver : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_solver_configurations_family",
                schema: "shadowvale",
                table: "solver_configurations");

            migrationBuilder.AddCheckConstraint(
                name: "ck_solver_configurations_family",
                schema: "shadowvale",
                table: "solver_configurations",
                sql: "(family = 'Classical') = (algorithm IN ('Greedy', 'Genetic', 'ClassicalSa', 'Tabu')) AND (family = 'QuantumHardware') = (algorithm = 'QpuDwave')");

            // The seeder only fills an empty table, so databases seeded before tabu existed get it here
            // (inactive, solver defaults, default QUBO weights, 120 ms like the other seeds)
            migrationBuilder.Sql("""
                INSERT INTO shadowvale.solver_configurations
                    (id, code, name, algorithm, family, library, params, qubo_weights, time_budget_ms, is_active, created_at, updated_at)
                SELECT gen_random_uuid(), 'tabu', 'Tabu search (tuned)', 'Tabu', 'Classical', 'custom', '{}'::jsonb,
                       '{"penalty_conflict": 0, "weight_cover": 0.5, "weight_coverage": 1, "weight_distance": 0.1, "weight_flanking": 1, "weight_redundancy": 0.5}'::jsonb,
                       120, false, now(), now()
                WHERE EXISTS (SELECT 1 FROM shadowvale.solver_configurations)
                  AND NOT EXISTS (SELECT 1 FROM shadowvale.solver_configurations WHERE code = 'tabu');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Tabu rows would break the old constraint; one that was used by sessions blocks the rollback (FK)
            migrationBuilder.Sql("DELETE FROM shadowvale.solver_configurations WHERE algorithm = 'Tabu';");

            migrationBuilder.DropCheckConstraint(
                name: "ck_solver_configurations_family",
                schema: "shadowvale",
                table: "solver_configurations");

            migrationBuilder.AddCheckConstraint(
                name: "ck_solver_configurations_family",
                schema: "shadowvale",
                table: "solver_configurations",
                sql: "(family = 'Classical') = (algorithm IN ('Greedy', 'Genetic', 'ClassicalSa')) AND (family = 'QuantumHardware') = (algorithm = 'QpuDwave')");
        }
    }
}
