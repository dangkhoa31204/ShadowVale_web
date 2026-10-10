using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using ShadowVale.API.Options;

namespace ShadowVale.API.Authentication;

// The game has no user login: each build sends a shared key in X-Game-Key. It only keeps out casual spam
// (a key shipped in a game build can be extracted), so it is paired with rate limiting.
public sealed class GameKeyAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IOptions<GameOptions> gameOptions) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "GameKey";
    public const string HeaderName = "X-Game-Key";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderName, out var values) || string.IsNullOrEmpty(values.ToString()))
            return Task.FromResult(AuthenticateResult.NoResult());

        if (!IsKnownKey(values.ToString(), gameOptions.Value.ApiKeys))
            return Task.FromResult(AuthenticateResult.Fail("Invalid game key."));

        var identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, "game")], SchemeName);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }

    // Compares SHA-256 hashes in constant time, so neither the content nor the length of a key leaks through timing
    public static bool IsKnownKey(string provided, IEnumerable<string> keys)
    {
        var providedHash = SHA256.HashData(Encoding.UTF8.GetBytes(provided));
        var match = false;
        foreach (var key in keys)
            match |= CryptographicOperations.FixedTimeEquals(providedHash, SHA256.HashData(Encoding.UTF8.GetBytes(key)));
        return match;
    }
}
