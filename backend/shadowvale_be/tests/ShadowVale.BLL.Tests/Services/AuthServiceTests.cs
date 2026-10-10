using NSubstitute;
using ShadowVale.BLL.DTOs.Auth;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;
using Shouldly;
using Microsoft.IdentityModel.JsonWebTokens;

namespace ShadowVale.BLL.Tests.Services;

public class AuthServiceTests
{
    [Fact]
    public async Task Logout_invalidates_its_access_session_but_preserves_other_device()
    {
        var user = TestHelpers.User(password: "Password123!");
        _users.GetByUsernameOrEmailAsync(user.Username, Arg.Any<CancellationToken>()).Returns(user);
        var sessions = new List<RefreshToken>();
        _refreshTokens.When(r => r.AddAsync(Arg.Any<RefreshToken>(), Arg.Any<CancellationToken>()))
            .Do(call => sessions.Add(call.Arg<RefreshToken>()));
        _refreshTokens.GetByHashWithUserAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(call => sessions.SingleOrDefault(s => s.TokenHash == call.Arg<string>()));
        _refreshTokens.IsSessionActiveAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(call => sessions.Any(s => s.Id == call.ArgAt<Guid>(0) && s.UserId == call.ArgAt<Guid>(1)
                && s.RevokedAt == null && s.ExpiresAt > call.ArgAt<DateTime>(2)));
        var first = (await _sut.LoginAsync(new() { UsernameOrEmail = user.Username, Password = "Password123!" })).Data!;
        var second = (await _sut.LoginAsync(new() { UsernameOrEmail = user.Username, Password = "Password123!" })).Data!;
        Guid Session(string token) => Guid.Parse(new JsonWebToken(token).GetClaim(TokenService.SessionClaim).Value);
        var firstId = Session(first.AccessToken); var secondId = Session(second.AccessToken);
        firstId.ShouldNotBe(secondId);
        (await _sut.IsSessionActiveAsync(firstId, user.Id)).ShouldBeTrue();
        (await _sut.IsSessionActiveAsync(firstId, Guid.NewGuid())).ShouldBeFalse();
        await _sut.LogoutAsync(first.RefreshToken);
        (await _sut.IsSessionActiveAsync(firstId, user.Id)).ShouldBeFalse();
        (await _sut.IsSessionActiveAsync(secondId, user.Id)).ShouldBeTrue();
        await _sut.LogoutAsync(first.RefreshToken); // remains idempotent
        (await _sut.IsSessionActiveAsync(secondId, user.Id)).ShouldBeTrue();
    }

    [Fact]
    public async Task Refresh_binds_new_access_token_to_new_row_and_revokes_old_pair()
    {
        var user = TestHelpers.User();
        var (token, hash, _) = _tokenService.CreateRefreshToken();
        var old = new RefreshToken { User = user, UserId = user.Id, TokenHash = hash, ExpiresAt = TestHelpers.Now.AddDays(1) };
        _refreshTokens.GetByHashWithUserAsync(hash, Arg.Any<CancellationToken>()).Returns(old);
        RefreshToken? created = null;
        _refreshTokens.When(r => r.AddAsync(Arg.Any<RefreshToken>(), Arg.Any<CancellationToken>()))
            .Do(call => created = call.Arg<RefreshToken>());
        var response = await _sut.RefreshAsync(token);
        old.RevokedAt.ShouldBe(TestHelpers.Now);
        created.ShouldNotBeNull(); created.Id.ShouldNotBe(old.Id);
        new JsonWebToken(response.AccessToken).GetClaim(TokenService.SessionClaim).Value.ShouldBe(created.Id.ToString());
        created.TokenHash.ShouldBe(_tokenService.HashRefreshToken(response.RefreshToken));
    }

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

        response.Failure.ShouldBeNull();
        response.Data.ShouldNotBeNull();
        response.Data.AccessToken.ShouldNotBeNullOrEmpty();
        response.Data.User.Username.ShouldBe("designer01");
        user.LastLoginAt.ShouldBe(TestHelpers.Now);
        await _refreshTokens.Received(1).AddAsync(
            Arg.Is<RefreshToken>(t => t.UserId == user.Id && t.TokenHash == _tokenService.HashRefreshToken(response.Data.RefreshToken)),
            Arg.Any<CancellationToken>());
        await _refreshTokens.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsFailureWithoutIssuingTokens()
    {
        _users.GetByUsernameOrEmailAsync("designer01", Arg.Any<CancellationToken>()).Returns(TestHelpers.User());

        var result = await _sut.LoginAsync(new LoginRequest { UsernameOrEmail = "designer01", Password = "wrong-password" });
        result.Failure.ShouldBe(LoginFailure.InvalidCredentials);
        result.Data.ShouldBeNull();
        await _refreshTokens.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Login_WithUnknownUser_ThrowsSameErrorAsWrongPassword()
    {
        var result = await _sut.LoginAsync(new LoginRequest { UsernameOrEmail = "nobody", Password = "Password123!" });
        result.Failure.ShouldBe(LoginFailure.InvalidCredentials);
        result.Data.ShouldBeNull();
    }

    [Fact]
    public async Task Login_WithDeactivatedAccount_ReturnsFailureWithoutIssuingTokens()
    {
        _users.GetByUsernameOrEmailAsync("designer01", Arg.Any<CancellationToken>())
            .Returns(TestHelpers.User(password: "Password123!", isActive: false));

        var result = await _sut.LoginAsync(new LoginRequest { UsernameOrEmail = "designer01", Password = "Password123!" });
        result.Failure.ShouldBe(LoginFailure.AccountDeactivated);
        result.Data.ShouldBeNull();
        await _refreshTokens.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
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

    [Fact]
    public async Task Login_WithEmail_NormalizesLookup()
    {
        var user = TestHelpers.User();
        _users.GetByUsernameOrEmailAsync(user.Email, Arg.Any<CancellationToken>()).Returns(user);
        var response = await _sut.LoginAsync(new LoginRequest
            { UsernameOrEmail = "  DESIGNER01@SHADOWVALE.TEST ", Password = "Password123!" });
        response.Data.ShouldNotBeNull();
        response.Data.User.Id.ShouldBe(user.Id);
    }

    [Fact]
    public async Task Refresh_UnknownToken_DoesNotIssueTokens()
    {
        await Should.ThrowAsync<UnauthorizedException>(() => _sut.RefreshAsync("unknown-token"));
        await _refreshTokens.DidNotReceive().AddAsync(Arg.Any<RefreshToken>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Refresh_ExpiredAtBoundaryOrDisabledUser_DoesNotIssueTokens(bool expired)
    {
        var (token, hash, _) = _tokenService.CreateRefreshToken();
        var user = TestHelpers.User(isActive: expired);
        _refreshTokens.GetByHashWithUserAsync(hash, Arg.Any<CancellationToken>()).Returns(new RefreshToken
            { UserId = user.Id, User = user, TokenHash = hash,
                ExpiresAt = expired ? TestHelpers.Now : TestHelpers.Now.AddDays(1) });
        await Should.ThrowAsync<UnauthorizedException>(() => _sut.RefreshAsync(token));
        await _refreshTokens.DidNotReceive().AddAsync(Arg.Any<RefreshToken>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Logout_ActiveToken_RevokesOnlyThatSession()
    {
        var (token, hash, _) = _tokenService.CreateRefreshToken();
        var stored = new RefreshToken { UserId = Guid.NewGuid(), TokenHash = hash, ExpiresAt = TestHelpers.Now.AddDays(1) };
        _refreshTokens.GetByHashWithUserAsync(hash, Arg.Any<CancellationToken>()).Returns(stored);
        await _sut.LogoutAsync(token);
        stored.RevokedAt.ShouldBe(TestHelpers.Now);
        await _refreshTokens.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _refreshTokens.DidNotReceive().RevokeAllForUserAsync(Arg.Any<Guid>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Logout_UnknownOrRevokedToken_IsIdempotent()
    {
        await _sut.LogoutAsync("unknown-token");
        var (token, hash, _) = _tokenService.CreateRefreshToken();
        _refreshTokens.GetByHashWithUserAsync(hash, Arg.Any<CancellationToken>()).Returns(new RefreshToken
            { TokenHash = hash, RevokedAt = TestHelpers.Now.AddHours(-1) });
        await _sut.LogoutAsync(token);
        await _refreshTokens.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Me_ExistingUser_ReturnsPublicInformation()
    {
        var user = TestHelpers.User();
        _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);
        var result = await _sut.GetCurrentUserAsync(user.Id);
        result.Id.ShouldBe(user.Id); result.Role.ShouldBe("Designer");
    }

    [Fact]
    public async Task Me_UnknownUser_ThrowsNotFound() =>
        await Should.ThrowAsync<NotFoundException>(() => _sut.GetCurrentUserAsync(Guid.NewGuid()));

    [Fact]
    public async Task ChangePassword_UnknownUser_ThrowsNotFound() =>
        await Should.ThrowAsync<NotFoundException>(() => _sut.ChangePasswordAsync(Guid.NewGuid(),
            new ChangePasswordRequest { CurrentPassword = "Password123!", NewPassword = "NewPassword456!" }));
}
