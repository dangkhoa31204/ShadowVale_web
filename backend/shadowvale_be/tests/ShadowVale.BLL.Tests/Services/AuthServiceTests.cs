using NSubstitute;
using ShadowVale.BLL.DTOs.Auth;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class AuthServiceTests
{
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly IRefreshTokenRepository _refreshTokens = Substitute.For<IRefreshTokenRepository>();
    private readonly TokenService _tokenService;
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        var time = TestHelpers.FixedTime();
        _tokenService = TestHelpers.TokenService(time);
        _sut = new AuthService(_users, _refreshTokens, TestHelpers.PasswordHasher, _tokenService, time);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsTokensAndStoresHashedRefreshToken()
    {
        var user = TestHelpers.User(password: "Password123!");
        _users.GetByUsernameOrEmailAsync("designer01", Arg.Any<CancellationToken>()).Returns(user);

        // Mixed case + spaces: lookups must be normalized
        var response = await _sut.LoginAsync(new LoginRequest { UsernameOrEmail = "  Designer01 ", Password = "Password123!" });

        response.AccessToken.ShouldNotBeNullOrEmpty();
        response.User.Username.ShouldBe("designer01");
        user.LastLoginAt.ShouldBe(TestHelpers.Now);
        await _refreshTokens.Received(1).AddAsync(
            Arg.Is<RefreshToken>(t => t.UserId == user.Id && t.TokenHash == _tokenService.HashRefreshToken(response.RefreshToken)),
            Arg.Any<CancellationToken>());
        await _refreshTokens.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Login_WithWrongPassword_ThrowsUnauthorized()
    {
        _users.GetByUsernameOrEmailAsync("designer01", Arg.Any<CancellationToken>()).Returns(TestHelpers.User());

        await Should.ThrowAsync<UnauthorizedException>(() =>
            _sut.LoginAsync(new LoginRequest { UsernameOrEmail = "designer01", Password = "wrong-password" }));
    }

    [Fact]
    public async Task Login_WithUnknownUser_ThrowsSameErrorAsWrongPassword()
    {
        var ex = await Should.ThrowAsync<UnauthorizedException>(() =>
            _sut.LoginAsync(new LoginRequest { UsernameOrEmail = "nobody", Password = "Password123!" }));

        ex.Message.ShouldBe("Invalid username or password.");
    }

    [Fact]
    public async Task Login_WithDeactivatedAccount_ThrowsForbidden()
    {
        _users.GetByUsernameOrEmailAsync("designer01", Arg.Any<CancellationToken>())
            .Returns(TestHelpers.User(password: "Password123!", isActive: false));

        await Should.ThrowAsync<ForbiddenException>(() =>
            _sut.LoginAsync(new LoginRequest { UsernameOrEmail = "designer01", Password = "Password123!" }));
    }

    [Fact]
    public async Task Refresh_WithValidToken_RevokesItAndIssuesNewPair()
    {
        var (token, hash, _) = _tokenService.CreateRefreshToken();
        var stored = new RefreshToken { User = TestHelpers.User(), TokenHash = hash, ExpiresAt = TestHelpers.Now.AddDays(1) };
        stored.UserId = stored.User.Id;
        _refreshTokens.GetByHashWithUserAsync(hash, Arg.Any<CancellationToken>()).Returns(stored);

        var response = await _sut.RefreshAsync(token);

        stored.RevokedAt.ShouldBe(TestHelpers.Now);
        response.RefreshToken.ShouldNotBe(token);
        await _refreshTokens.Received(1).AddAsync(Arg.Any<RefreshToken>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Refresh_WithAlreadyRevokedToken_RevokesAllSessionsOfThatUser()
    {
        var (token, hash, _) = _tokenService.CreateRefreshToken();
        var stored = new RefreshToken
        {
            User = TestHelpers.User(), TokenHash = hash,
            ExpiresAt = TestHelpers.Now.AddDays(1), RevokedAt = TestHelpers.Now.AddHours(-1)
        };
        stored.UserId = stored.User.Id;
        _refreshTokens.GetByHashWithUserAsync(hash, Arg.Any<CancellationToken>()).Returns(stored);

        await Should.ThrowAsync<UnauthorizedException>(() => _sut.RefreshAsync(token));

        await _refreshTokens.Received(1).RevokeAllForUserAsync(stored.UserId, TestHelpers.Now, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Refresh_WithExpiredToken_ThrowsUnauthorized()
    {
        var (token, hash, _) = _tokenService.CreateRefreshToken();
        var stored = new RefreshToken { User = TestHelpers.User(), TokenHash = hash, ExpiresAt = TestHelpers.Now.AddSeconds(-1) };
        _refreshTokens.GetByHashWithUserAsync(hash, Arg.Any<CancellationToken>()).Returns(stored);

        await Should.ThrowAsync<UnauthorizedException>(() => _sut.RefreshAsync(token));
    }

    [Fact]
    public async Task ChangePassword_WithWrongCurrentPassword_ThrowsValidation()
    {
        var user = TestHelpers.User(password: "Password123!");
        _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);

        await Should.ThrowAsync<ValidationException>(() => _sut.ChangePasswordAsync(user.Id,
            new ChangePasswordRequest { CurrentPassword = "wrong", NewPassword = "NewPassword456!" }));
    }

    [Fact]
    public async Task ChangePassword_WithCorrectCurrentPassword_UpdatesHashAndSignsOutEverywhere()
    {
        var user = TestHelpers.User(password: "Password123!");
        _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);

        await _sut.ChangePasswordAsync(user.Id,
            new ChangePasswordRequest { CurrentPassword = "Password123!", NewPassword = "NewPassword456!" });

        TestHelpers.PasswordHasher.VerifyHashedPassword(user, user.PasswordHash, "NewPassword456!")
            .ShouldNotBe(Microsoft.AspNetCore.Identity.PasswordVerificationResult.Failed);
        await _refreshTokens.Received(1).RevokeAllForUserAsync(user.Id, TestHelpers.Now, Arg.Any<CancellationToken>());
    }
}
