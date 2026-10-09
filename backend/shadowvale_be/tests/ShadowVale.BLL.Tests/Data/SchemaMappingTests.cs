using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using ShadowVale.DAL.Data;

namespace ShadowVale.BLL.Tests.Data;

// Metadata captured from the shared database; these tests never connect to it.
public class SchemaMappingTests
{
    private static JsonDocument ReadSchema() => JsonDocument.Parse(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "database-schema.json")));

    private static ShadowValeDbContext CreateContext() => new(
        new DbContextOptionsBuilder<ShadowValeDbContext>()
            .UseNpgsql("Host=localhost;Database=schema_mapping_test")
            .UseSnakeCaseNamingConvention().Options);

    [Fact]
    public void Model_matches_migration_snapshot()
    {
        using var db = CreateContext();
        Assert.False(db.Database.HasPendingModelChanges());
        Assert.True(db.Model.FindEntityType(typeof(ShadowVale.DAL.Entities.ContentVersion))!
            .FindProperty(nameof(ShadowVale.DAL.Entities.ContentVersion.Revision))!.IsConcurrencyToken);
    }

    [Fact]
    public void Tables_and_columns_match_captured_database_schema()
    {
        using var schema = ReadSchema();
        using var db = CreateContext();
        var model = db.GetService<IDesignTimeModel>().Model;
        var tables = model.GetRelationalModel().Tables.ToDictionary(t => t.Name);
        var expected = schema.RootElement.GetProperty("columns").EnumerateArray()
            .Where(c => c.GetProperty("table_name").GetString() != "__ef_migrations_history")
            .GroupBy(c => c.GetProperty("table_name").GetString()!);

        Assert.Equal(expected.Select(g => g.Key).Order(), tables.Keys.Order());
        foreach (var group in expected)
        {
            var table = tables[group.Key];
            Assert.Equal(ShadowValeDbContext.Schema, table.Schema);
            Assert.Equal(group.Select(c => c.GetProperty("column_name").GetString()).Order(),
                table.Columns.Select(c => c.Name).Order());
            foreach (var column in group)
            {
                var name = column.GetProperty("column_name").GetString()!;
                var mapped = table.FindColumn(name)!;
                Assert.Equal(column.GetProperty("is_nullable").GetString() == "YES", mapped.IsNullable);
                var type = column.GetProperty("data_type").GetString();
                var expectedType = type switch
                {
                    "character varying" => $"character varying({column.GetProperty("character_maximum_length").GetInt32()})",
                    "numeric" => $"numeric({column.GetProperty("numeric_precision").GetInt32()},{column.GetProperty("numeric_scale").GetInt32()})",
                    "ARRAY" => "text[]",
                    _ => type
                };
                Assert.Equal(expectedType, mapped.StoreType);
                var property = mapped.PropertyMappings.Single().Property;
                Assert.Equal(column.GetProperty("column_default").GetString(), property.GetDefaultValueSql());
                Assert.Equal(column.GetProperty("is_identity").GetString() == "YES",
                    property.FindAnnotation("Npgsql:ValueGenerationStrategy")?.Value?.ToString()
                        is "IdentityByDefaultColumn" or "IdentityAlwaysColumn");
                if (column.GetProperty("is_identity").GetString() == "YES")
                    Assert.Equal("IdentityAlwaysColumn",
                        property.FindAnnotation("Npgsql:ValueGenerationStrategy")?.Value?.ToString());
            }
        }
    }

    [Fact]
    public void Keys_foreign_keys_and_checks_match_captured_database_schema()
    {
        using var schema = ReadSchema();
        using var db = CreateContext();
        var model = db.GetService<IDesignTimeModel>().Model;
        var entities = model.GetEntityTypes().ToDictionary(e => e.GetTableName()!);
        var expected = schema.RootElement.GetProperty("constraints").EnumerateArray()
            .Where(c => c.GetProperty("table_name").GetString() != "__ef_migrations_history").ToArray();
        Assert.Equal(expected.Length, entities.Values.Sum(e =>
            e.GetKeys().Count() + e.GetForeignKeys().Count() + e.GetCheckConstraints().Count()));

        foreach (var constraint in expected)
        {
            var entity = entities[constraint.GetProperty("table_name").GetString()!];
            var name = constraint.GetProperty("name").GetString();
            var definition = constraint.GetProperty("definition").GetString()!;
            switch (constraint.GetProperty("type").GetString())
            {
                case "p":
                    Assert.Equal(name, entity.FindPrimaryKey()!.GetName());
                    break;
                case "c":
                    // PostgreSQL deparses expressions with casts and extra parentheses;
                    // the source migration contains their original SQL spelling.
                    Assert.False(string.IsNullOrWhiteSpace(entity.GetCheckConstraints().Single(c => c.Name == name).Sql));
                    break;
                case "f":
                    var match = Regex.Match(definition,
                        @"FOREIGN KEY \((\w+)\) REFERENCES shadowvale\.(\w+)\(id\) ON DELETE (.+)");
                    Assert.True(match.Success);
                    var fk = entity.GetForeignKeys().Single(f => f.GetConstraintName() == name);
                    Assert.Equal(match.Groups[1].Value, fk.Properties.Single().GetColumnName());
                    Assert.Equal(match.Groups[2].Value, fk.PrincipalEntityType.GetTableName());
                    Assert.Equal("id", fk.PrincipalKey.Properties.Single().GetColumnName());
                    Assert.Equal(match.Groups[3].Value switch
                    {
                        "CASCADE" => DeleteBehavior.Cascade,
                        "SET NULL" => DeleteBehavior.SetNull,
                        "RESTRICT" => DeleteBehavior.Restrict,
                        _ => throw new InvalidOperationException(definition)
                    }, fk.DeleteBehavior);
                    break;
            }
        }
    }

    [Fact]
    public void Indexes_match_captured_database_schema()
    {
        using var schema = ReadSchema();
        using var db = CreateContext();
        var model = db.GetService<IDesignTimeModel>().Model;
        var indexes = model.GetEntityTypes().SelectMany(e => e.GetIndexes())
            .ToDictionary(i => i.GetDatabaseName()!);
        var expected = schema.RootElement.GetProperty("indexes").EnumerateArray()
            .Where(i => i.GetProperty("tablename").GetString() != "__ef_migrations_history"
                && !i.GetProperty("indexname").GetString()!.StartsWith("pk_")).ToArray();
        Assert.Equal(expected.Length, indexes.Count);
        foreach (var index in expected)
        {
            var mapped = indexes[index.GetProperty("indexname").GetString()!];
            var sql = index.GetProperty("indexdef").GetString()!;
            var match = Regex.Match(sql, @"USING (\w+) \(([^)]+)\)(?: WHERE (.*))?$");
            Assert.True(match.Success);
            Assert.Equal(match.Groups[2].Value.Split(", "), mapped.Properties.Select(p => p.GetColumnName()));
            Assert.Equal(sql.StartsWith("CREATE UNIQUE"), mapped.IsUnique);
            Assert.Equal(match.Groups[1].Value, mapped.GetMethod() ?? "btree");
            static string? NormalizeFilter(string? filter) => filter == null ? null :
                Regex.Replace(filter.Replace("::text", ""), @"[\s()]", "");
            Assert.Equal(NormalizeFilter(match.Groups[3].Success ? match.Groups[3].Value : null),
                NormalizeFilter(mapped.GetFilter()));
        }
    }
}
