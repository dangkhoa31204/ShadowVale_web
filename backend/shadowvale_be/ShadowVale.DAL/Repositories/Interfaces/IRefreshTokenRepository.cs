using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Repositories.Interfaces;

public interface IRefreshTokenRepository : IGenericRepository<RefreshToken>
{
    Task<bool> IsSessionActiveAsync(Guid sessionId, Guid userId, DateTime now, CancellationToken ct = default);
    Task<RefreshToken?> GetByHashWithUserAsync(string tokenHash, CancellationToken ct = default);

    // Writes straight to the database; does not need SaveChangesAsync
    Task RevokeAllForUserAsync(Guid userId, DateTime revokedAt, CancellationToken ct = default);
}
