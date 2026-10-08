using ShadowVale.BLL.DTOs.Users;

namespace ShadowVale.BLL.DTOs.Auth;

public sealed record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken,
    DateTime RefreshTokenExpiresAt,
    UserDto User);
