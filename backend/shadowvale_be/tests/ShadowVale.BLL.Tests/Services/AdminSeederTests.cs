using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using ShadowVale.BLL.Options;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class AdminSeederTests
{
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private AdminSeeder Create(SeedAdminOptions options) => new(_users, TestHelpers.PasswordHasher,
        Microsoft.Extensions.Options.Options.Create(options), Substitute.For<ILogger<AdminSeeder>>());

    [Fact]
    public async Task Missing_configuration_does_not_create_admin()
    {
        await Create(new SeedAdminOptions()).SeedAsync();
        await _users.DidNotReceive().AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Existing_admin_is_preserved()
    {
        _users.AnyAdminAsync(Arg.Any<CancellationToken>()).Returns(true);
        await Create(new SeedAdminOptions { Username = "admin", Email = "admin@example.test", Password = "Password123!" }).SeedAsync();
        await _users.DidNotReceive().AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task First_admin_is_normalized_and_password_is_hashed()
    {
        User? created = null;
        _users.When(u => u.AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>()))
            .Do(call => created = call.Arg<User>());
        await Create(new SeedAdminOptions { Username = "  ADMIN  ", Email = "ADMIN@EXAMPLE.TEST", Password = "Password123!" }).SeedAsync();
        created.ShouldNotBeNull();
        created.Username.ShouldBe("admin"); created.Email.ShouldBe("admin@example.test");
        created.Role.ShouldBe(UserRole.Admin); created.IsActive.ShouldBeTrue();
        created.PasswordHash.ShouldNotBe("Password123!");
        TestHelpers.PasswordHasher.VerifyHashedPassword(created, created.PasswordHash, "Password123!")
            .ShouldBe(Microsoft.AspNetCore.Identity.PasswordVerificationResult.Success);
    }
}
