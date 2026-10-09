namespace ShadowVale.API.Authentication;

public static class AuthPolicies
{
    // Game endpoints: authenticated by X-Game-Key only, never by a user JWT
    public const string Game = "Game";
}
