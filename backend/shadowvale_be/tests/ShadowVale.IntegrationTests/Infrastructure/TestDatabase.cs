using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL;
using ShadowVale.DAL.Data;

namespace ShadowVale.IntegrationTests.Infrastructure;

// Integration tests run against a real, disposable PostgreSQL database (all its tables are truncated).
// Never point SHADOWVALE_TEST_DB at Supabase.
public static class TestDatabase
{
    public const string EnvironmentVariable = "SHADOWVALE_TEST_DB";

    public static string? ConnectionString =>
        Environment.GetEnvironmentVariable(EnvironmentVariable) is { Length: > 0 } value ? value : null;

    // GitHub Actions sets CI=true: there a missing database must fail the build instead of skipping tests
    public static bool IsCi => string.Equals(Environment.GetEnvironmentVariable("CI"), "true", StringComparison.OrdinalIgnoreCase);

    public static bool ShouldSkip => ConnectionString is null && !IsCi;

    public static string SkipReason => $"Set {EnvironmentVariable} to run integration tests (see backend README).";

    public static ShadowValeDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ShadowValeDbContext>();
        options.UseShadowValeDatabase(ConnectionString ?? throw new InvalidOperationException($"{EnvironmentVariable} is not set."));
        return new ShadowValeDbContext(options.Options);
    }
}

// [Fact] / [Theory] that is skipped locally when no test database is configured
public sealed class DbFactAttribute : FactAttribute
{
    public DbFactAttribute()
    {
        if (TestDatabase.ShouldSkip)
            Skip = TestDatabase.SkipReason;
    }
}

public sealed class DbTheoryAttribute : TheoryAttribute
{
    public DbTheoryAttribute()
    {
        if (TestDatabase.ShouldSkip)
            Skip = TestDatabase.SkipReason;
    }
}
