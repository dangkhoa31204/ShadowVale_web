using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ShadowVale.API.Authentication;
using ShadowVale.BLL.DTOs.Auth;
using ShadowVale.BLL.Interfaces;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Entities;

namespace ShadowVale.IntegrationTests.Infrastructure;

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class ApiCollection : ICollectionFixture<ApiFixture>
{
    public const string Name = "Api";
}

// One API instance over the test database for the whole run. Tests call ResetAsync first, so each starts empty.
public sealed class ApiFixture : IAsyncLifetime
{
    public const string GameKey = "integration-test-game-key-0123456789abcdef";
    public const string Password = "Password123!";

    private WebApplicationFactory<Program>? _factory;

    public WebApplicationFactory<Program> Factory =>
        _factory ?? throw new InvalidOperationException($"{TestDatabase.EnvironmentVariable} is not set.");

    public async Task InitializeAsync()
    {
        var connectionString = TestDatabase.ConnectionString;
        if (connectionString is null)
            return; // skipped locally; fails through Factory in CI

        // Schema must exist before the API starts, because startup seeders query it
        await using (var db = TestDatabase.CreateContext())
            await db.Database.MigrateAsync();

        // Program reads configuration before WebApplicationFactory hooks run, so pass it as environment variables
        Environment.SetEnvironmentVariable("ConnectionStrings__Default", connectionString);
        Environment.SetEnvironmentVariable("Jwt__Key", "integration-test-jwt-key-0123456789abcdef");
        Environment.SetEnvironmentVariable("Game__ApiKeys__0", GameKey);
        // Every test request comes from the same "IP"
        Environment.SetEnvironmentVariable("RateLimits__Auth__PermitLimit", "100000");
        Environment.SetEnvironmentVariable("RateLimits__Game__PermitLimit", "100000");

        // Not "Development": that would load the developer's user-secrets (real Supabase settings)
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b => b.UseEnvironment("Testing"));
    }

    // Same app on a real Kestrel server (random local port), for behaviour the in-memory test server does not have
    public WebApplicationFactory<Program> CreateKestrelFactory()
    {
        _ = Factory;
        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b => b.UseEnvironment("Testing"));
        factory.UseKestrel(0);
        factory.StartServer();
        return factory;
    }

    public async Task DisposeAsync()
    {
        if (_factory is not null)
            await _factory.DisposeAsync();
    }

    public async Task ResetAsync()
    {
        _ = Factory; // fails fast in CI when the database is missing
        await using var db = TestDatabase.CreateContext();
        var tables = await db.Database.SqlQuery<string>($"""
            SELECT quote_ident(tablename) AS "Value" FROM pg_tables
            WHERE schemaname = {ShadowValeDbContext.Schema} AND tablename <> '__ef_migrations_history'
            """).ToListAsync();
        var list = string.Join(", ", tables.Select(t => $"{ShadowValeDbContext.Schema}.{t}"));
#pragma warning disable EF1002 // table names come from pg_tables, not from user input
        await db.Database.ExecuteSqlRawAsync($"TRUNCATE {list} RESTART IDENTITY CASCADE");
#pragma warning restore EF1002
    }

    public async Task<T> WithDbAsync<T>(Func<ShadowValeDbContext, Task<T>> action)
    {
        await using var db = TestDatabase.CreateContext();
        return await action(db);
    }

    public Task WithDbAsync(Func<ShadowValeDbContext, Task> action) =>
        WithDbAsync(async db => { await action(db); return 0; });

    // The startup seed ran before ResetAsync emptied the tables; run it again for tests that need it
    public async Task SeedSolverConfigurationsAsync()
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<ISolverConfigurationSeeder>().SeedAsync();
    }

    public HttpClient CreateClient() => Factory.CreateClient();

    public HttpClient CreateGameClient(string key = GameKey)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add(GameKeyAuthenticationHandler.HeaderName, key);
        return client;
    }

    // Inserts an active user with the given role and returns a client logged in as them
    public async Task<HttpClient> CreateUserClientAsync(UserRole role)
    {
        var username = $"{role.ToString().ToLowerInvariant()}_{Guid.NewGuid():N}"[..30];
        await WithDbAsync(async db =>
        {
            var user = new User { Username = username, Email = $"{username}@shadowvale.test", Role = role };
            user.PasswordHash = new PasswordHasher<User>().HashPassword(user, Password);
            db.Users.Add(user);
            await db.SaveChangesAsync();
        });

        var client = Factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { UsernameOrEmail = username, Password = Password });
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        return client;
    }
}

// Base class: every test starts from empty tables
[Collection(ApiCollection.Name)]
public abstract class IntegrationTest(ApiFixture api) : IAsyncLifetime
{
    protected ApiFixture Api { get; } = api;

    public virtual Task InitializeAsync() => TestDatabase.ShouldSkip ? Task.CompletedTask : Api.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;
}
