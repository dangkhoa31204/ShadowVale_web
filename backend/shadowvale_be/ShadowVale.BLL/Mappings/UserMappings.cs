using ShadowVale.BLL.DTOs.Users;
using ShadowVale.BLL.Exceptions;
using ShadowVale.DAL.Entities;

namespace ShadowVale.BLL.Mappings;

public static class UserMappings
{
    public static UserDto ToDto(this User user) => new(
        user.Id,
        user.Username,
        user.Email,
        user.FullName,
        user.Role.ToString(),
        user.IsActive,
        user.LastLoginAt,
        user.CreatedAt);

    // Exact role names only (case-insensitive): Enum.TryParse alone would also accept "1" or "Admin, Analyst"
    public static UserRole ParseRole(string role, string field = "Role")
    {
        foreach (var value in Enum.GetValues<UserRole>())
        {
            if (string.Equals(value.ToString(), role.Trim(), StringComparison.OrdinalIgnoreCase))
                return value;
        }

        throw new ValidationException(field, $"Role must be one of: {string.Join(", ", Enum.GetNames<UserRole>())}.");
    }

    public static string NormalizeIdentifier(string value) => value.Trim().ToLowerInvariant();
}
