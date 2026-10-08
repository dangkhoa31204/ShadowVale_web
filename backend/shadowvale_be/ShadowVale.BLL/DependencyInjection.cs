using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Services;
using ShadowVale.DAL;
using ShadowVale.DAL.Entities;

namespace ShadowVale.BLL;

public static class DependencyInjection
{
    // API only calls this; BLL wires up DAL so the API never touches the data layer directly.
    // Options (JwtOptions, SeedAdminOptions) are bound by the API, which owns configuration.
    public static IServiceCollection AddBll(this IServiceCollection services, string connectionString)
    {
        services.AddDal(connectionString);

        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddSingleton<ITokenService, TokenService>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IAdminSeeder, AdminSeeder>();

        return services;
    }
}
