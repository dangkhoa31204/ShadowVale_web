using System.Text.Json;
using ShadowVale.BLL.Exceptions;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services.Content;

// JSON columns (stats, nav graph, objectives...) arrive as JsonElement and are stored as their raw text
internal static class ContentJson
{
    public static JsonElement ToElement(string json) => JsonDocument.Parse(json).RootElement.Clone();

    // Missing / null -> fallback; wrong kind (e.g. an array where an object is expected) -> 400 on that field
    public static string Normalize(JsonElement? value, JsonValueKind expected, string field, string fallback)
    {
        if (value is null || value.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            return fallback;
        if (value.Value.ValueKind != expected)
            throw new ValidationException(field, $"{field} must be a JSON {(expected == JsonValueKind.Object ? "object" : "array")}.");
        return value.Value.GetRawText();
    }

    public static string Object(JsonElement? value, string field) => Normalize(value, JsonValueKind.Object, field, "{}");
    public static string Array(JsonElement? value, string field) => Normalize(value, JsonValueKind.Array, field, "[]");
}

// Turns the code a designer typed into the id of that row in the same version
internal static class ContentReferences
{
    public static async Task<Guid> RequireAsync<T>(IContentRepository content, Guid versionId, string? code, string field, CancellationToken ct)
        where T : ContentEntity
    {
        var codes = await content.CodesAsync<T>(versionId, ct);
        return Require(codes, code, field);
    }

    public static Guid Require(Dictionary<Guid, string> codes, string? code, string field)
    {
        var match = codes.FirstOrDefault(c => c.Value == code);
        return match.Value is null
            ? throw new ValidationException(field, $"'{code}' does not exist in this content version.")
            : match.Key;
    }

    public static string? CodeOf(Dictionary<Guid, string> codes, Guid? id) =>
        id is { } key && codes.TryGetValue(key, out var code) ? code : null;
}

// Gate for every content change: only a Draft (or a Rejected version, which goes back to Draft on its first edit) can change
public class ContentEditor(IContentRepository content)
{
    public async Task EnsureVersionExistsAsync(Guid versionId, CancellationToken ct)
    {
        if (!await content.VersionExistsAsync(versionId, ct))
            throw new NotFoundException("Content version", versionId);
    }

    // Marks the version as changed: the stored bundle no longer matches, and the revision (concurrency token) moves on
    public async Task<ContentVersion> OpenForEditAsync(Guid versionId, CancellationToken ct)
    {
        var version = await content.GetVersionAsync(versionId, ct) ?? throw new NotFoundException("Content version", versionId);
        if (version.Status is not (ContentStatus.Draft or ContentStatus.Rejected))
            throw new ConflictException(
                $"Content version {version.VersionNo} is {version.Status} and can no longer be edited. Create a new version based on it instead.");

        version.Status = ContentStatus.Draft;
        version.Revision++;
        version.Bundle = null;
        version.BundleChecksum = null;
        version.ValidationErrors = null;
        version.ValidatedAt = null;
        return version;
    }

    // Duplicate codes and bad references surface as 409/400 from the database; two editors saving at once as 409
    public Task SaveAsync(CancellationToken ct) => DatabaseErrors.GuardAsync(() => content.SaveChangesAsync(ct));

    public static void EnsureCodeFree(IEnumerable<string> existingCodes, string code, string what)
    {
        if (existingCodes.Contains(code))
            throw new ConflictException($"{what} code '{code}' is already used in this content version.");
    }

    public static void EnsureUnreferenced(List<string> references, string what, string code)
    {
        if (references.Count > 0)
            throw new ConflictException($"{what} '{code}' is still used by {string.Join(", ", references.Take(5))}" +
                                        (references.Count > 5 ? $" and {references.Count - 5} more" : "") + ". Remove those references first.");
    }
}
