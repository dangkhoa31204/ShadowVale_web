using Microsoft.AspNetCore.Identity;
using NSubstitute;
using ShadowVale.BLL.Options;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Entities;

namespace ShadowVale.BLL.Tests;

internal static class TestHelpers
{
    public static readonly DateTime Now = new(2026, 10, 8, 12, 0, 0, DateTimeKind.Utc);

    public static readonly PasswordHasher<User> PasswordHasher = new();

    public static TimeProvider FixedTime()
    {
        var time = Substitute.For<TimeProvider>();
        time.GetUtcNow().Returns(new DateTimeOffset(Now));
        return time;
    }

    public static JwtOptions JwtOptions() => new()
    {
        Issuer = "test-issuer",
        Audience = "test-audience",
        Key = "test-signing-key-that-is-at-least-32-chars",
        AccessTokenMinutes = 15,
        RefreshTokenDays = 7
    };

    public static TokenService TokenService(TimeProvider time) =>
        new(Microsoft.Extensions.Options.Options.Create(JwtOptions()), time);

    public static User User(string password = "Password123!", UserRole role = UserRole.Designer, bool isActive = true)
    {
        var user = new User
        {
            Username = "designer01",
            Email = "designer01@shadowvale.test",
            Role = role,
            IsActive = isActive,
            CreatedAt = Now
        };
        user.PasswordHash = PasswordHasher.HashPassword(user, password);
        return user;
    }
}
