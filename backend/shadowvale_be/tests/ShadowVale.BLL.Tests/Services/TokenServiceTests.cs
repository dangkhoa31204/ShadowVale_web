using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Text;
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

    [Theory]
    [InlineData("valid", true)]
    [InlineData("wrong-key", false)]
    [InlineData("wrong-issuer", false)]
    [InlineData("wrong-audience", false)]
    [InlineData("expired", false)]
    [InlineData("tampered", false)]
    public async Task Access_token_signature_identity_and_lifetime_are_validated(string scenario, bool expected)
    {
        var options = TestHelpers.JwtOptions();
        var (token, _) = _sut.CreateAccessToken(TestHelpers.User());
        if (scenario == "tampered")
        {
            var parts = token.Split('.');
            parts[1] = Convert.ToBase64String(Encoding.UTF8.GetBytes("{\"sub\":\"changed\"}"))
                .TrimEnd('=').Replace('+', '-').Replace('/', '_');
            token = string.Join('.', parts);
        }
        var checkTime = scenario == "expired" ? TestHelpers.Now.AddMinutes(16) : TestHelpers.Now;
        var result = await new JsonWebTokenHandler().ValidateTokenAsync(token, new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                scenario == "wrong-key" ? "another-signing-key-at-least-32-chars" : options.Key)),
            ValidateIssuer = true, ValidIssuer = scenario == "wrong-issuer" ? "other" : options.Issuer,
            ValidateAudience = true, ValidAudience = scenario == "wrong-audience" ? "other" : options.Audience,
            ValidateLifetime = true, RequireExpirationTime = true,
            LifetimeValidator = (notBefore, expires, _, _) =>
                notBefore <= checkTime && expires > checkTime
        });
        result.IsValid.ShouldBe(expected);
    }
}
