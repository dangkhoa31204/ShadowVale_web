using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShadowVale.DAL.Migrations
{
    /// <inheritdoc />
    public partial class GameTelemetryAnalytics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Algorithm names now match the solver repo: QAOA runs on numpy (not qiskit-aer), SQA is its own implementation
            migrationBuilder.Sql("UPDATE shadowvale.solver_configurations SET algorithm = 'Qaoa' WHERE algorithm = 'QaoaAer';");
            migrationBuilder.Sql("UPDATE shadowvale.solver_configurations SET algorithm = 'Sqa' WHERE algorithm = 'SqaNeal';");

            migrationBuilder.DropColumn(
                name: "encounter_outcome",
                schema: "shadowvale",
                table: "coordination_results");

            migrationBuilder.DropColumn(
                name: "escape_time_ms",
                schema: "shadowvale",
                table: "coordination_results");

            migrationBuilder.AlterColumn<Guid>(
                name: "content_version_id",
                schema: "shadowvale",
                table: "game_sessions",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "map_code",
                schema: "shadowvale",
                table: "game_sessions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "solver_configuration_id",
                schema: "shadowvale",
                table: "game_sessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "source",
                schema: "shadowvale",
                table: "game_sessions",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "human");

            migrationBuilder.AddColumn<string>(
                name: "stats",
                schema: "shadowvale",
                table: "game_sessions",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'{}'::jsonb");

            migrationBuilder.CreateIndex(
                name: "ix_game_sessions_map_code",
                schema: "shadowvale",
                table: "game_sessions",
                column: "map_code");

            migrationBuilder.CreateIndex(
                name: "ix_game_sessions_solver_configuration_id",
                schema: "shadowvale",
                table: "game_sessions",
                column: "solver_configuration_id");

            migrationBuilder.CreateIndex(
                name: "ix_game_sessions_source",
                schema: "shadowvale",
                table: "game_sessions",
                column: "source");

            migrationBuilder.AddCheckConstraint(
                name: "ck_game_sessions_source",
                schema: "shadowvale",
                table: "game_sessions",
                sql: "source IN ('human', 'replay')");

            migrationBuilder.AddForeignKey(
                name: "fk_game_sessions_solver_configurations_solver_configuration_id",
                schema: "shadowvale",
                table: "game_sessions",
                column: "solver_configuration_id",
                principalSchema: "shadowvale",
                principalTable: "solver_configurations",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_game_sessions_solver_configurations_solver_configuration_id",
                schema: "shadowvale",
                table: "game_sessions");

            migrationBuilder.DropIndex(
                name: "ix_game_sessions_map_code",
                schema: "shadowvale",
                table: "game_sessions");

            migrationBuilder.DropIndex(
                name: "ix_game_sessions_solver_configuration_id",
                schema: "shadowvale",
                table: "game_sessions");

            migrationBuilder.DropIndex(
                name: "ix_game_sessions_source",
                schema: "shadowvale",
                table: "game_sessions");

            migrationBuilder.DropCheckConstraint(
                name: "ck_game_sessions_source",
                schema: "shadowvale",
                table: "game_sessions");

            migrationBuilder.DropColumn(
                name: "map_code",
                schema: "shadowvale",
                table: "game_sessions");

            migrationBuilder.DropColumn(
                name: "solver_configuration_id",
                schema: "shadowvale",
                table: "game_sessions");

            migrationBuilder.DropColumn(
                name: "source",
                schema: "shadowvale",
                table: "game_sessions");

            migrationBuilder.DropColumn(
                name: "stats",
                schema: "shadowvale",
                table: "game_sessions");

            migrationBuilder.AlterColumn<Guid>(
                name: "content_version_id",
                schema: "shadowvale",
                table: "game_sessions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "encounter_outcome",
                schema: "shadowvale",
                table: "coordination_results",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "escape_time_ms",
                schema: "shadowvale",
                table: "coordination_results",
                type: "double precision",
                nullable: true);

            migrationBuilder.Sql("UPDATE shadowvale.solver_configurations SET algorithm = 'QaoaAer' WHERE algorithm = 'Qaoa';");
            migrationBuilder.Sql("UPDATE shadowvale.solver_configurations SET algorithm = 'SqaNeal' WHERE algorithm = 'Sqa';");
        }
    }
}
