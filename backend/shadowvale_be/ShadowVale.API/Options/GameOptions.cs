namespace ShadowVale.API.Options;

// Bound from the "Game" config section (user-secrets / env vars, never appsettings.json)
public class GameOptions
{
    public const string SectionName = "Game";
    public const int MinKeyLength = 32;

    // Keys the game build sends in X-Game-Key. Several are allowed so a key can be rotated without downtime.
    public string[] ApiKeys { get; set; } = [];

    public bool IsValid() => ApiKeys.Length > 0 && ApiKeys.All(k => k is { Length: >= MinKeyLength });
}
