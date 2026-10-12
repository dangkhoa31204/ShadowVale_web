using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShadowVale.DAL.Migrations;

public partial class AllowArchivingUnvalidatedDrafts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropCheckConstraint(
            name: "ck_content_versions_published_has_bundle", schema: "shadowvale", table: "content_versions");
        migrationBuilder.AddCheckConstraint(
            name: "ck_content_versions_published_has_bundle", schema: "shadowvale", table: "content_versions",
            sql: "(status <> 'Published' AND (status <> 'Archived' OR published_at IS NULL)) OR (bundle IS NOT NULL AND bundle_checksum IS NOT NULL)");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropCheckConstraint(
            name: "ck_content_versions_published_has_bundle", schema: "shadowvale", table: "content_versions");
        migrationBuilder.AddCheckConstraint(
            name: "ck_content_versions_published_has_bundle", schema: "shadowvale", table: "content_versions",
            sql: "status NOT IN ('Published', 'Archived') OR (bundle IS NOT NULL AND bundle_checksum IS NOT NULL)");
    }
}
