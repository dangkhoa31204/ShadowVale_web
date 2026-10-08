using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.DAL.Repositories;

public class RefreshTokenRepository(ShadowValeDbContext context)
    : GenericRepository<RefreshToken>(context), IRefreshTokenRepository
{
    public Task<RefreshToken?> GetByHashWithUserAsync(string tokenHash, CancellationToken ct = default) =>
        DbSet.Include(t => t.User).FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

    public Task RevokeAllForUserAsync(Guid userId, DateTime revokedAt, CancellationToken ct = default) =>
        DbSet
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s
                .SetProperty(t => t.RevokedAt, revokedAt)
                .SetProperty(t => t.UpdatedAt, revokedAt), ct);
}
