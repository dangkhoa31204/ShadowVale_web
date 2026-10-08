using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;

namespace ShadowVale.API.Extensions;

public static class ClaimsPrincipalExtensions
{
    // Only call on [Authorize] endpoints: there the token was validated, so "sub" is always present
    public static Guid GetUserId(this ClaimsPrincipal principal) =>
        Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new InvalidOperationException("Authenticated principal has no 'sub' claim."));
}
