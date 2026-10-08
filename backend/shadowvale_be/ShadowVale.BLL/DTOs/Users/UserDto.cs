namespace ShadowVale.BLL.DTOs.Users;

public sealed record UserDto(
    Guid Id,
    string Username,
    string Email,
    string? FullName,
    string Role,
    bool IsActive,
    DateTime? LastLoginAt,
    DateTime CreatedAt);
