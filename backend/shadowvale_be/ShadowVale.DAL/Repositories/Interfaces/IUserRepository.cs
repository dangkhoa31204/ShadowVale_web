using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Repositories.Interfaces;

public interface IUserRepository : IGenericRepository<User>
{
    Task ExecuteInTransactionAsync(Func<Task> operation, CancellationToken ct = default);
    // Inputs are expected to be lower-cased already (see User)
    Task<User?> GetByUsernameOrEmailAsync(string usernameOrEmail, CancellationToken ct = default);
    Task<bool> UsernameExistsAsync(string username, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, Guid? excludeUserId = null, CancellationToken ct = default);
    Task<bool> AnyAdminAsync(CancellationToken ct = default);

    Task<(List<User> Items, int TotalCount)> SearchAsync(
        string? search, UserRole? role, bool? isActive, int page, int pageSize, CancellationToken ct = default);
}
