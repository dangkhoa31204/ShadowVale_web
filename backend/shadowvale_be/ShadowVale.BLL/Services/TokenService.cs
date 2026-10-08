using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Options;
using ShadowVale.DAL.Entities;

namespace ShadowVale.BLL.Services;

public class TokenService(IOptions<JwtOptions> options, TimeProvider time) : ITokenService
{
    // Claim names the API's JwtBearer setup reads back (NameClaimType / RoleClaimType)
    public const string RoleClaim = "role";

    private readonly JwtOptions _options = options.Value;
    private readonly JsonWebTokenHandler _handler = new();

    public (string Token, DateTime ExpiresAt) CreateAccessToken(User user)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var expiresAt = now.AddMinutes(_options.AccessTokenMinutes);

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = expiresAt,
            Claims = new Dictionary<string, object>
            {
                [JwtRegisteredClaimNames.Sub] = user.Id.ToString(),
                [JwtRegisteredClaimNames.UniqueName] = user.Username,
                [JwtRegisteredClaimNames.Email] = user.Email,
                [JwtRegisteredClaimNames.Jti] = Guid.NewGuid().ToString(),
                [RoleClaim] = user.Role.ToString()
            },
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key)), SecurityAlgorithms.HmacSha256)
        };

        return (_handler.CreateToken(descriptor), expiresAt);
    }

    public (string Token, string TokenHash, DateTime ExpiresAt) CreateRefreshToken()
    {
        var token = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(64));
        var expiresAt = time.GetUtcNow().UtcDateTime.AddDays(_options.RefreshTokenDays);
        return (token, HashRefreshToken(token), expiresAt);
    }

    // Plain SHA-256 is enough here: the token is 512 random bits, so there is nothing to brute-force
    public string HashRefreshToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
