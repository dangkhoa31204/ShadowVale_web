using ShadowVale.DAL.Entities;

namespace ShadowVale.BLL.Constants;

// String constants for [Authorize(Roles = ...)], tied to the enum so a rename breaks the build instead of auth
public static class AppRoles
{
    public const string Admin = nameof(UserRole.Admin);
    public const string Designer = nameof(UserRole.Designer);
    public const string Analyst = nameof(UserRole.Analyst);
}
