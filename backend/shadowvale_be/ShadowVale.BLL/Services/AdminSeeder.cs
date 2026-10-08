using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Mappings;
using ShadowVale.BLL.Options;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services;

// Creates the first Admin at startup when the database has none, so someone can log in and create the rest.
// The password comes from config instead of a migration, so it never ends up in git.
public class AdminSeeder(
    IUserRepository users,
    IPasswordHasher<User> passwordHasher,
    IOptions<SeedAdminOptions> options,
    ILogger<AdminSeeder> logger) : IAdminSeeder
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        var seed = options.Value;
        if (string.IsNullOrWhiteSpace(seed.Username) || string.IsNullOrWhiteSpace(seed.Email) || string.IsNullOrWhiteSpace(seed.Password))
            return;

        if (await users.AnyAdminAsync(ct))
            return;

        var admin = new User
        {
            Username = UserMappings.NormalizeIdentifier(seed.Username),
            Email = UserMappings.NormalizeIdentifier(seed.Email),
            FullName = "Administrator",
            Role = UserRole.Admin
        };
        admin.PasswordHash = passwordHasher.HashPassword(admin, seed.Password);

        await users.AddAsync(admin, ct);
        await users.SaveChangesAsync(ct);
        logger.LogInformation("Seeded initial admin account '{Username}'", admin.Username);
    }
}
