namespace ShadowVale.BLL.Options;

// Bound from the "SeedAdmin" config section (user-secrets / env vars, never appsettings.json).
// Used once to create the first Admin when the database has none.
public class SeedAdminOptions
{
    public const string SectionName = "SeedAdmin";

    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
}
