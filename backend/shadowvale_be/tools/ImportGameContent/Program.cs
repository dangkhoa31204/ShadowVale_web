using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using ShadowVale.BLL.Services;

// One-off import of the content the Unity game ships today into a schema 1.0 bundle (docs/game-integration.md).
//   convert --unity <ShadowVale/Assets> [--out game-content-v1.json]   build the bundle and check it with the backend validator
//   push --bundle <file> --api <base url>                              create a Draft from it through the authoring API;
//                                                                      the token of a Designer or Admin comes from SVL_TOKEN
// Submit, approve and publish stay in the web app, so the bundle goes through the normal review.
var command = args.FirstOrDefault();
string? Option(string name) => args.SkipWhile(a => a != name).Skip(1).FirstOrDefault();

try
{
    switch (command)
    {
        case "convert":
        {
            var unity = Option("--unity") ?? throw new ArgumentException("--unity <path to ShadowVale/Assets> is required.");
            var output = Option("--out") ?? "game-content-v1.json";
            var (bundle, notes) = GameContentConverter.Convert(unity);
            var errors = new ContentBundleValidator().Validate(bundle);

            File.WriteAllText(output, bundle.ToJsonString(new JsonSerializerOptions
            {
                WriteIndented = true,
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
            }) + "\n");
            Console.WriteLine($"Wrote {output}");
            foreach (var note in notes)
                Console.WriteLine($"  note: {note}");
            foreach (var error in errors)
                Console.Error.WriteLine($"  INVALID {error.Path}: {error.Message}");
            Console.WriteLine(errors.Count == 0 ? "Bundle passes the backend validator." : $"{errors.Count} validation error(s).");
            return errors.Count == 0 ? 0 : 1;
        }
        case "push":
        {
            var file = Option("--bundle") ?? throw new ArgumentException("--bundle <file> is required.");
            var api = Option("--api") ?? throw new ArgumentException("--api <base url> is required, e.g. http://localhost:5079.");
            var token = Environment.GetEnvironmentVariable("SVL_TOKEN");
            if (string.IsNullOrWhiteSpace(token))
                throw new ArgumentException("Set SVL_TOKEN to the access token of a Designer or Admin (POST /api/auth/login).");
            var bundle = JsonNode.Parse(File.ReadAllText(file))!.AsObject();
            return await BundleUploader.PushAsync(bundle, api, token) ? 0 : 1;
        }
        default:
            Console.Error.WriteLine("Usage: convert --unity <ShadowVale/Assets> [--out file] | push --bundle <file> --api <url>");
            return 2;
    }
}
catch (Exception ex) when (ex is ArgumentException or IOException or JsonException or HttpRequestException)
{
    Console.Error.WriteLine(ex.Message);
    return 2;
}
