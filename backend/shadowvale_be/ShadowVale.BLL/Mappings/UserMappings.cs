using ShadowVale.BLL.DTOs.Users;
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

    public static UserRole ParseRole(string role, string field = "Role") => EnumParsing.Parse<UserRole>(role, field);

    public static string NormalizeIdentifier(string value) => value.Trim().ToLowerInvariant();
}
