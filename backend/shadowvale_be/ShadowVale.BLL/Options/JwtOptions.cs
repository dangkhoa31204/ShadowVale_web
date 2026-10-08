using System.ComponentModel.DataAnnotations;

namespace ShadowVale.BLL.Options;

// Bound from the "Jwt" config section
public class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required] public string Issuer { get; set; } = null!;
    [Required] public string Audience { get; set; } = null!;

    // HS256 needs a key of at least 256 bits
    [Required, MinLength(32)] public string Key { get; set; } = null!;

    [Range(1, 1440)] public int AccessTokenMinutes { get; set; } = 15;
    [Range(1, 90)] public int RefreshTokenDays { get; set; } = 7;
}
