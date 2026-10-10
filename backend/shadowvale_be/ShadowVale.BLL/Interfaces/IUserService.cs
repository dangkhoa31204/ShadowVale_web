using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.DTOs.Users;

namespace ShadowVale.BLL.Interfaces;

public interface IUserService
{
    Task<bool> IsAccessAllowedAsync(Guid userId, string role, CancellationToken ct = default);
    Task<PagedResult<UserDto>> GetUsersAsync(UserQuery query, CancellationToken ct = default);
    Task<UserDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken ct = default);
    Task<UserDto> UpdateAsync(Guid id, UpdateUserRequest request, Guid currentUserId, CancellationToken ct = default);
    Task ResetPasswordAsync(Guid id, ResetPasswordRequest request, CancellationToken ct = default);
}
