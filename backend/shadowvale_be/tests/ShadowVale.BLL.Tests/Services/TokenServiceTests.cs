using Microsoft.IdentityModel.JsonWebTokens;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Entities;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class TokenServiceTests
{
    private readonly TokenService _sut = TestHelpers.TokenService(TestHelpers.FixedTime());

    [Fact]
    public void CreateAccessToken_ContainsIdentityAndRoleClaims()
    {
        var user = TestHelpers.User(role: UserRole.Analyst);

        var (token, expiresAt) = _sut.CreateAccessToken(user);

        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(token);
        jwt.Subject.ShouldBe(user.Id.ToString());
        jwt.GetClaim(TokenService.RoleClaim).Value.ShouldBe("Analyst");
        jwt.GetClaim(JwtRegisteredClaimNames.UniqueName).Value.ShouldBe(user.Username);
        jwt.Issuer.ShouldBe("test-issuer");
        expiresAt.ShouldBe(TestHelpers.Now.AddMinutes(15));
    }

    [Fact]
    public void CreateRefreshToken_ReturnsHashThatMatchesToken()
    {
        var (token, hash, expiresAt) = _sut.CreateRefreshToken();

        hash.ShouldBe(_sut.HashRefreshToken(token));
        hash.ShouldNotBe(token);
        expiresAt.ShouldBe(TestHelpers.Now.AddDays(7));
    }

    [Fact]
    public void CreateRefreshToken_IsDifferentEveryTime()
    {
        _sut.CreateRefreshToken().Token.ShouldNotBe(_sut.CreateRefreshToken().Token);
    }
}
