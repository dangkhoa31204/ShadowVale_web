using System.ComponentModel.DataAnnotations;

namespace ShadowVale.BLL.DTOs.Auth;

public sealed record LoginRequest
{
    [Required, MaxLength(256)] public string UsernameOrEmail { get; init; } = "";
    [Required, MaxLength(128)] public string Password { get; init; } = "";
}

public sealed record RefreshTokenRequest
{
    [Required] public string RefreshToken { get; init; } = "";
}

public sealed record ChangePasswordRequest
{
    [Required] public string CurrentPassword { get; init; } = "";
    [Required, MinLength(8), MaxLength(128)] public string NewPassword { get; init; } = "";
}
