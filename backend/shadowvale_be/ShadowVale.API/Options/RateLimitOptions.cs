using System.ComponentModel.DataAnnotations;

namespace ShadowVale.API.Options;

// Bound from the "RateLimits" config section; limits are per client IP
public class RateLimitOptions
{
    public const string SectionName = "RateLimits";

    // Login / refresh: brute-force protection
    [Required] public FixedWindow Auth { get; set; } = new() { PermitLimit = 10 };

    // Game API: anti-spam (one session makes about two requests)
    [Required] public FixedWindow Game { get; set; } = new() { PermitLimit = 120 };

    public class FixedWindow
    {
        [Range(1, 1_000_000)] public int PermitLimit { get; set; }
        [Range(1, 3600)] public int WindowSeconds { get; set; } = 60;
    }
}
