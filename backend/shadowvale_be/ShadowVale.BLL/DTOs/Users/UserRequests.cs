using System.ComponentModel.DataAnnotations;

namespace ShadowVale.BLL.DTOs.Users;

public sealed record UserQuery
{
    public string? Search { get; init; }
    public string? Role { get; init; }
    public bool? IsActive { get; init; }
    [Range(1, 1000000)] public int Page { get; init; } = 1;
    [Range(1, 100)] public int PageSize { get; init; } = 20;
}

public sealed record CreateUserRequest
{
    [Required, RegularExpression("^[a-zA-Z0-9_.-]{3,50}$",
        ErrorMessage = "Username must be 3-50 characters: letters, digits, '_', '.', '-'.")]
    public string Username { get; init; } = "";

    [Required, EmailAddress, MaxLength(256)] public string Email { get; init; } = "";
    [MaxLength(100)] public string? FullName { get; init; }
    [Required, MinLength(8), MaxLength(128)] public string Password { get; init; } = "";
    [Required] public string Role { get; init; } = "";
}

// Username is immutable; everything else an Admin can change
public sealed record UpdateUserRequest
{
    [Required, EmailAddress, MaxLength(256)] public string Email { get; init; } = "";
    [MaxLength(100)] public string? FullName { get; init; }
    [Required] public string Role { get; init; } = "";
    [Required] public bool? IsActive { get; init; }
}

public sealed record ResetPasswordRequest
{
    [Required, MinLength(8), MaxLength(128)] public string NewPassword { get; init; } = "";
}
