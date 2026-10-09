using ShadowVale.API.Authentication;
using Shouldly;

namespace ShadowVale.IntegrationTests.Authentication;

// Pure checks of the key comparison; the HTTP behaviour (401 / 200) is covered in GameApiTests
public class GameKeyTests
{
    private static readonly string[] Keys = ["first-key-0123456789abcdefghijklmnop", "second-key-0123456789abcdefghijklmno"];

    [Theory]
    [InlineData("first-key-0123456789abcdefghijklmnop", true)]
    [InlineData("second-key-0123456789abcdefghijklmno", true)]
    [InlineData("first-key-0123456789abcdefghijklmno", false)]
    [InlineData("FIRST-KEY-0123456789ABCDEFGHIJKLMNOP", false)]
    [InlineData("", false)]
    public void IsKnownKey_MatchesExactKeysOnly(string provided, bool expected)
    {
        GameKeyAuthenticationHandler.IsKnownKey(provided, Keys).ShouldBe(expected);
    }
}
