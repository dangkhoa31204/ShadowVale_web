using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.DAL.Repositories;

public class UserRepository(ShadowValeDbContext context) : GenericRepository<User>(context), IUserRepository
{
    public async Task ExecuteInTransactionAsync(Func<Task> operation, CancellationToken ct = default)
    {
        await using var transaction = await Context.Database.BeginTransactionAsync(ct);
        await operation();
        await transaction.CommitAsync(ct);
    }
    public Task<User?> GetByUsernameOrEmailAsync(string usernameOrEmail, CancellationToken ct = default) =>
        DbSet.FirstOrDefaultAsync(u => u.Username == usernameOrEmail || u.Email == usernameOrEmail, ct);

    public Task<bool> UsernameExistsAsync(string username, CancellationToken ct = default) =>
        DbSet.AnyAsync(u => u.Username == username, ct);

    public Task<bool> EmailExistsAsync(string email, Guid? excludeUserId = null, CancellationToken ct = default) =>
        DbSet.AnyAsync(u => u.Email == email && u.Id != excludeUserId, ct);

    public Task<bool> AnyAdminAsync(CancellationToken ct = default) =>
        DbSet.AnyAsync(u => u.Role == UserRole.Admin, ct);

    public async Task<(List<User> Items, int TotalCount)> SearchAsync(
        string? search, UserRole? role, bool? isActive, int page, int pageSize, CancellationToken ct = default)
    {
        if (page is < 1 or > 1000000 || pageSize is < 1 or > 100)
            throw new ArgumentOutOfRangeException(nameof(page), "Invalid pagination.");
        var query = DbSet.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(u =>
                u.Username.Contains(term) ||
                u.Email.Contains(term) ||
                (u.FullName != null && u.FullName.ToLower().Contains(term)));
        }

        if (role is not null)
            query = query.Where(u => u.Role == role);

        if (isActive is not null)
            query = query.Where(u => u.IsActive == isActive);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(u => u.Username)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }
}
