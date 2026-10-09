using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Repositories;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.DAL;

public static class DependencyInjection
{
    public static IServiceCollection AddDal(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<ShadowValeDbContext>(options => options.UseShadowValeDatabase(connectionString));

        // Exposed by the API at /health: checks the Supabase connection
        services.AddHealthChecks().AddDbContextCheck<ShadowValeDbContext>("database");

        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();

        return services;
    }

    // Shared with the integration tests, which migrate the test database before the API starts
    public static DbContextOptionsBuilder UseShadowValeDatabase(this DbContextOptionsBuilder options, string connectionString) =>
        options
            .UseNpgsql(connectionString, npgsql =>
                npgsql.MigrationsHistoryTable("__ef_migrations_history", ShadowValeDbContext.Schema))
            // users, refresh_tokens, password_hash... instead of quoted "Users"/"PasswordHash" in Postgres
            .UseSnakeCaseNamingConvention();
}
