using ShadowVale.BLL.DTOs.Auth;
using ShadowVale.BLL.DTOs.Users;

namespace ShadowVale.BLL.Interfaces;

public interface IAuthService
{
    Task<bool> IsSessionActiveAsync(Guid sessionId, Guid userId, CancellationToken ct = default);
    Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthResponse> RefreshAsync(string refreshToken, CancellationToken ct = default);
    Task LogoutAsync(string refreshToken, CancellationToken ct = default);
    Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken ct = default);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default);
}
