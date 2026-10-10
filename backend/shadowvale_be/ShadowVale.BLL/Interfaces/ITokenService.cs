using ShadowVale.DAL.Entities;

namespace ShadowVale.BLL.Interfaces;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateAccessToken(User user, Guid? sessionId = null);

    // Token goes to the client, TokenHash goes to the database
    (string Token, string TokenHash, DateTime ExpiresAt) CreateRefreshToken();

    string HashRefreshToken(string token);
}
