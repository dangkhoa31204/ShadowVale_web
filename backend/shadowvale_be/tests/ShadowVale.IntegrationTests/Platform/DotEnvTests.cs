using ShadowVale.API.Extensions;
using Shouldly;

namespace ShadowVale.IntegrationTests.Platform;

public class DotEnvTests
{
    [Fact]
    public void Parse_reads_keys_and_keeps_equals_signs_inside_values()
    {
        var values = DotEnv.Parse(
        [
            "# local secrets",
            "",
            "ConnectionStrings__Default=Host=db.example;Password=a=b;SSL Mode=Require",
            "  Jwt__Key = \"quoted value\"  ",
            "Game__ApiKeys__0='single'",
            "not a setting",
            "=missing key"
        ]).ToDictionary();

        values.Count.ShouldBe(3);
        values["ConnectionStrings__Default"].ShouldBe("Host=db.example;Password=a=b;SSL Mode=Require");
        values["Jwt__Key"].ShouldBe("quoted value");
        values["Game__ApiKeys__0"].ShouldBe("single");
    }

    [Fact]
    public void Load_finds_the_file_in_a_parent_folder_and_never_overrides_existing_variables()
    {
        var root = Directory.CreateTempSubdirectory("shadowvale-dotenv-");
        var newKey = $"SHADOWVALE_DOTENV_NEW_{Guid.NewGuid():N}";
        var existingKey = $"SHADOWVALE_DOTENV_EXISTING_{Guid.NewGuid():N}";
        try
        {
            var nested = root.CreateSubdirectory("backend").CreateSubdirectory("api");
            var file = Path.Combine(root.FullName, DotEnv.FileName);
            File.WriteAllLines(file, [$"{newKey}=from-file", $"{existingKey}=from-file"]);
            Environment.SetEnvironmentVariable(existingKey, "already-set");

            DotEnv.Load(nested.FullName).ShouldBe(file);

            Environment.GetEnvironmentVariable(newKey).ShouldBe("from-file");
            Environment.GetEnvironmentVariable(existingKey).ShouldBe("already-set");
        }
        finally
        {
            Environment.SetEnvironmentVariable(newKey, null);
            Environment.SetEnvironmentVariable(existingKey, null);
            root.Delete(recursive: true);
        }
    }
}
