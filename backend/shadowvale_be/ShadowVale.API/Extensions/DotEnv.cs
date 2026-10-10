namespace ShadowVale.API.Extensions;

// Local development: reads KEY=VALUE lines from the nearest .env file (the start folder or any parent) into
// environment variables, e.g. ConnectionStrings__Default=... A variable that is already set wins, so real
// environment variables (Render, CI, the integration tests) are never overridden. No file: nothing happens.
public static class DotEnv
{
    public const string FileName = ".env";

    // Returns the file that was loaded, or null when there is none
    public static string? Load(string startDirectory)
    {
        var path = Find(startDirectory);
        if (path is null)
            return null;

        foreach (var (key, value) in Parse(File.ReadLines(path)))
        {
            if (Environment.GetEnvironmentVariable(key) is null)
                Environment.SetEnvironmentVariable(key, value);
        }

        return path;
    }

    public static string? Find(string startDirectory)
    {
        for (var directory = new DirectoryInfo(startDirectory); directory is not null; directory = directory.Parent)
        {
            var path = Path.Combine(directory.FullName, FileName);
            if (File.Exists(path))
                return path;
        }

        return null;
    }

    // Blank lines and # comments are skipped. Only the first '=' splits, so values may contain '=' (connection strings).
    public static IEnumerable<KeyValuePair<string, string>> Parse(IEnumerable<string> lines)
    {
        foreach (var raw in lines)
        {
            var line = raw.Trim();
            if (line.Length == 0 || line[0] == '#')
                continue;

            var separator = line.IndexOf('=');
            if (separator <= 0)
                continue;

            var key = line[..separator].Trim();
            var value = line[(separator + 1)..].Trim();
            if (value.Length >= 2 && value[0] is '"' or '\'' && value[^1] == value[0])
                value = value[1..^1];

            yield return new(key, value);
        }
    }
}
