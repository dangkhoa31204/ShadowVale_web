using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.Interfaces;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services;

public class ContentVersionService(IContentVersionRepository versions, IContentBundleValidator validator,
    TimeProvider time) : IContentVersionService
{
    public async Task<ServiceResult<ContentVersionDto>> SubmitAsync(Guid id, SubmitContentVersionRequest request,
        CancellationToken ct = default)
    {
        var editable = await FindEditableAsync(id, request.Revision, ct);
        if (editable.Error is not null) return editable.Error;
        var version = editable.Data!;
        // Recheck the validated snapshot rather than trusting a client-supplied status or bundle.
        var error = await CheckReviewBundleAsync(version, ct);
        if (error is not null) return error;
        version.Status = ContentStatus.InReview;
        version.SubmittedAt = time.GetUtcNow().UtcDateTime;
        version.ReviewedById = null;
        version.ReviewedAt = null;
        version.ReviewNote = null;
        version.Revision++;
        var saveError = await SaveAsync(ct);
        return saveError is not null ? saveError : ToDto(version);
    }

    public Task<ServiceResult<ContentVersionDto>> ApproveAsync(Guid id, ReviewContentVersionRequest request,
        Guid actorId, CancellationToken ct = default) => ReviewAsync(id, request, actorId, true, ct);

    public Task<ServiceResult<ContentVersionDto>> RejectAsync(Guid id, ReviewContentVersionRequest request,
        Guid actorId, CancellationToken ct = default) => ReviewAsync(id, request, actorId, false, ct);

    private async Task<ServiceResult<ContentVersionDto>> ReviewAsync(Guid id, ReviewContentVersionRequest request,
        Guid actorId, bool approve, CancellationToken ct)
    {
        if (request.ReviewNote?.Length > 2000 || (!approve && string.IsNullOrWhiteSpace(request.ReviewNote)))
            return Invalid("ReviewNote", "Reject requires a review note; notes must not exceed 2000 characters.");
        var result = await FindInStatusAsync(id, request.Revision, ContentStatus.InReview, ct);
        if (result.Error is not null) return result.Error;
        var version = result.Data!;
        if (approve)
        {
            var error = await CheckReviewBundleAsync(version, ct);
            if (error is not null) return error;
        }
        version.Status = approve ? ContentStatus.Approved : ContentStatus.Rejected;
        version.ReviewedById = actorId;
        version.ReviewedAt = time.GetUtcNow().UtcDateTime;
        version.ReviewNote = request.ReviewNote?.Trim();
        version.Revision++;
        var saveError = await SaveAsync(ct);
        return saveError is not null ? saveError : ToDto(version);
    }

    public async Task<ServiceResult<ContentVersionDto>> PublishAsync(Guid id, PublishContentVersionRequest request,
        Guid actorId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length > 500)
            return Invalid("Reason", "A publication reason of 1-500 characters is required.");
        var result = await FindInStatusAsync(id, request.Revision, ContentStatus.Approved, ct);
        if (result.Error is not null) return result.Error;
        var version = result.Data!;
        var error = await CheckReviewBundleAsync(version, ct);
        if (error is not null) return error;
        if (version.ReviewedById is null || version.ReviewedAt is null)
            return new ServiceError(ServiceErrorKind.Conflict, "CONTENT_VERSION_NOT_REVIEWED", "An Admin approval is required before publishing.");
        try
        {
            await versions.PublishAsync(version, actorId, request.Reason.Trim(), time.GetUtcNow().UtcDateTime, ct);
        }
        catch (DbUpdateConcurrencyException) { return Changed(); }
        return ToDto(version);
    }

    public async Task<ServiceResult<PagedResult<ContentPublicationDto>>> SearchPublicationsAsync(
        ContentPublicationQuery query, CancellationToken ct = default)
    {
        if (query.Page is < 1 or > 1000000 || query.PageSize is < 1 or > 100)
            return Invalid("Page", "Invalid pagination.");
        var (items, total) = await versions.SearchPublicationsAsync(query.ContentVersionId, query.Page, query.PageSize, ct);
        return new PagedResult<ContentPublicationDto>(items.Select(h => new ContentPublicationDto(h.Id,
            h.ContentVersionId, h.PreviousVersionId, h.Action.ToString(), h.ActorId, h.Reason, h.CreatedAt,
            h.ContentVersion?.VersionNo, h.ContentVersion?.Label, h.PreviousVersion?.VersionNo, h.Actor?.Username)).ToArray(),
            query.Page, query.PageSize, total);
    }

    public async Task<ServiceResult<ContentVersionDto>> RollbackAsync(Guid id, RollbackContentVersionRequest request,
        Guid actorId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length > 500)
            return Invalid("Reason", "A rollback reason of 1-500 characters is required.");
        var result = await FindInStatusAsync(id, request.Revision, ContentStatus.Archived, ct);
        if (result.Error is not null) return result.Error;
        var version = result.Data!;
        // Archived also covers deleted drafts; only a version that was live before can go live again.
        // Its stored bundle is served as it was approved, without revalidating against today's schema.
        if (version.PublishedAt is null || version.Bundle is null || version.BundleChecksum is null)
            return new ServiceError(ServiceErrorKind.Conflict, "CONTENT_VERSION_NEVER_PUBLISHED",
                "Only a version that was published before can be rolled back to.");
        try
        {
            await versions.RollbackAsync(version, actorId, request.Reason.Trim(), time.GetUtcNow().UtcDateTime, ct);
        }
        catch (DbUpdateConcurrencyException) { return Changed(); }
        return ToDto(version);
    }

    public async Task<ServiceResult<string>> GetBundleAsync(Guid id, CancellationToken ct = default)
    {
        var version = await versions.GetByIdAsync(id, ct);
        if (version is null) return Missing(id);
        if (version.ValidatedAt is null || version.Bundle is null)
            return new ServiceError(ServiceErrorKind.Conflict, "CONTENT_VERSION_NOT_VALIDATED",
                "This version has no validated bundle. Validate it first; every content edit clears the bundle.");
        return version.Bundle;
    }

    private async Task<ServiceResult<ContentVersion>> FindInStatusAsync(Guid id, long? revision,
        ContentStatus expected, CancellationToken ct)
    {
        if (revision is null or < 0) return Invalid("Revision", "Revision is required and cannot be negative.");
        var version = await versions.GetByIdAsync(id, ct);
        if (version is null) return Missing(id);
        if (version.Revision != revision || version.Revision == long.MaxValue) return Changed();
        if (version.Status != expected)
            return new ServiceError(ServiceErrorKind.Conflict, "CONTENT_VERSION_INVALID_STATUS", $"This action requires status {expected}.");
        return version;
    }

    private async Task<ServiceError?> CheckReviewBundleAsync(ContentVersion version, CancellationToken ct)
    {
        var snapshot = await versions.GetSnapshotAsync(version.Id, ct);
        if (snapshot is null) return Missing(version.Id);
        if (snapshot.Revision != version.Revision || snapshot.Status != version.Status) return Changed();
        if (version.ValidatedAt is null || version.Bundle is null || version.BundleChecksum is null)
            return Invalid("Bundle", "A validated bundle and checksum are required.");
        JsonObject? bundle;
        try { bundle = JsonNode.Parse(version.Bundle) as JsonObject; }
        catch (JsonException) { return Invalid("Bundle", "The stored bundle is not valid JSON."); }
        if (bundle is null) return Invalid("Bundle", "The stored bundle must be a JSON object.");
        // jsonb changes formatting/key order when read: hash the canonical JSON, as validation does.
        var canonical = CanonicalJson(bundle);
        var checksum = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
        if (checksum != version.BundleChecksum || canonical != CanonicalJson(ContentBundleBuilder.Build(snapshot)))
            return Invalid("Bundle", "The bundle no longer matches the validated content. Validate and submit it again.");
        var errors = validator.Validate(bundle).Concat(ReferenceErrors(snapshot)).Distinct().ToArray();
        return errors.Length == 0 ? null : new ServiceError(ServiceErrorKind.Validation, "CONTENT_BUNDLE_INVALID",
            "The content bundle failed validation.", errors.GroupBy(e => e.Path)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Message).ToArray()));
    }

    public async Task<ServiceResult<PagedResult<ContentVersionDto>>> SearchAsync(ContentVersionQuery query, CancellationToken ct = default)
    {
        ContentStatus? status = null;
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            if (!Enum.TryParse<ContentStatus>(query.Status, true, out var parsed) ||
                !Enum.IsDefined(parsed) || !Enum.GetNames<ContentStatus>().Any(n => n.Equals(query.Status, StringComparison.OrdinalIgnoreCase)))
                return Invalid("Status", "Unknown content status.");
            status = parsed;
        }
        if (query.Page is < 1 or > 1000000 || query.PageSize is < 1 or > 100)
            return Invalid("Page", "Invalid pagination.");
        var (items, total) = await versions.SearchAsync(query.Search, status, query.Page, query.PageSize, ct);
        return new PagedResult<ContentVersionDto>(items.Select(ToDto).ToArray(), query.Page, query.PageSize, total);
    }

    public async Task<ServiceResult<ContentVersionDetailsDto>> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var version = await versions.GetSnapshotAsync(id, ct);
        if (version is null) return Missing(id);
        return new ContentVersionDetailsDto(ToDto(version), JsonSerializer.SerializeToElement(ContentBundleBuilder.Build(version)));
    }

    public async Task<ServiceResult<ContentVersionDto>> CreateAsync(CreateContentVersionRequest request, Guid actorId, CancellationToken ct = default)
    {
        var metadataError = CheckMetadata(request.Label, request.SchemaVersion);
        if (metadataError is not null) return metadataError;
        var label = request.Label.Trim();
        var version = new ContentVersion
        {
            Label = label, Changelog = request.Changelog?.Trim(), AuthoredById = actorId,
            SchemaVersion = request.SchemaVersion, ParentVersionId = request.ParentVersionId
        };
        IReadOnlyList<BaseEntity> content = [];
        if (request.ParentVersionId.HasValue)
        {
            var source = await versions.GetSnapshotAsync(request.ParentVersionId.Value, ct);
            if (source is null) return Missing(request.ParentVersionId.Value);
            var cloned = CloneContent(source, version);
            if (cloned.Error is not null) return cloned.Error;
            content = cloned.Data!;
        }
        await versions.AddAsync(version, ct);
        versions.AddContent(content);
        var saveError = await SaveAsync(ct);
        if (saveError is not null) return saveError;
        return ToDto(version);
    }

    public async Task<ServiceResult<ContentComparisonDto>> CompareAsync(Guid id, Guid targetId, CancellationToken ct = default)
    {
        if (id == Guid.Empty) return Invalid("id", "A non-empty source content version ID is required.");
        if (targetId == Guid.Empty) return Invalid("targetId", "A non-empty target content version ID is required for comparison.");
        var sourceResult = await GetByIdAsync(id, ct);
        if (sourceResult.Error is not null) return sourceResult.Error;
        var targetResult = id == targetId ? sourceResult : await GetByIdAsync(targetId, ct);
        if (targetResult.Error is not null) return targetResult.Error;
        var source = sourceResult.Data!;
        var target = targetResult.Data!;
        return new ContentComparisonDto(id, source.Version.Revision, targetId, target.Version.Revision,
            ContentBundleComparison.Compare(JsonNode.Parse(source.Bundle.GetRawText())!.AsObject(),
                JsonNode.Parse(target.Bundle.GetRawText())!.AsObject()));
    }

    public async Task<ServiceResult<ContentVersionDto>> UpdateAsync(Guid id, UpdateContentVersionRequest request, CancellationToken ct = default)
    {
        var metadataError = CheckMetadata(request.Label, request.SchemaVersion);
        if (metadataError is not null) return metadataError;
        var label = request.Label.Trim();
        var editable = await FindEditableAsync(id, request.Revision, ct);
        if (editable.Error is not null) return editable.Error;
        var version = editable.Data!;
        version.Label = label;
        version.Changelog = request.Changelog?.Trim();
        version.SchemaVersion = request.SchemaVersion;
        version.Revision++;
        version.Bundle = null;
        version.BundleChecksum = null;
        version.ValidationErrors = null;
        version.ValidatedAt = null;
        var saveError = await SaveAsync(ct);
        if (saveError is not null) return saveError;
        return ToDto(version);
    }

    public async Task<ServiceResult<ContentValidationResultDto>> ValidateAsync(Guid id, ValidateContentVersionRequest request, CancellationToken ct = default)
    {
        var editable = await FindEditableAsync(id, request.Revision, ct);
        if (editable.Error is not null) return editable.Error;
        var version = editable.Data!;
        var snapshot = await versions.GetSnapshotAsync(id, ct);
        if (snapshot is null) return Missing(id);
        if (snapshot.Revision != version.Revision) return Changed();
        var bundle = ContentBundleBuilder.Build(snapshot);
        var errors = validator.Validate(bundle).Concat(ReferenceErrors(snapshot)).Distinct().ToArray();
        var validatedAt = time.GetUtcNow().UtcDateTime;
        version.Revision++;
        version.ValidatedAt = validatedAt;
        version.ValidationErrors = JsonSerializer.Serialize(errors, JsonSerializerOptions.Web);
        version.Bundle = errors.Length == 0 ? CanonicalJson(bundle) : null;
        version.BundleChecksum = version.Bundle == null ? null :
            Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(version.Bundle)));
        var saveError = await SaveAsync(ct);
        if (saveError is not null) return saveError;
        return new ContentValidationResultDto(id, version.Revision, errors.Length == 0, validatedAt, version.BundleChecksum, errors);
    }

    private async Task<ServiceResult<ContentVersion>> FindEditableAsync(Guid id, long? revision, CancellationToken ct)
    {
        if (revision == null || revision < 0) return Invalid("Revision", "Revision is required and cannot be negative.");
        var version = await versions.GetByIdAsync(id, ct);
        if (version is null) return Missing(id);
        if (version.Status != ContentStatus.Draft)
            return new ServiceError(ServiceErrorKind.Conflict, "CONTENT_VERSION_NOT_DRAFT", "Only Draft content versions can be changed, deleted or validated.");
        if (version.Revision != revision || version.Revision == long.MaxValue) return Changed();
        return version;
    }

    public async Task<ServiceResult<bool>> DeleteAsync(Guid id, DeleteContentVersionRequest request, CancellationToken ct = default)
    {
        var editable = await FindEditableAsync(id, request.Revision, ct);
        if (editable.Error is not null) return editable.Error;
        var version = editable.Data!;
        version.Status = ContentStatus.Archived;
        version.ArchivedAt = time.GetUtcNow().UtcDateTime;
        version.Revision++;
        var saveError = await SaveAsync(ct);
        if (saveError is not null) return saveError;
        return true;
    }

    private async Task<ServiceError?> SaveAsync(CancellationToken ct)
    {
        try { await versions.SaveChangesAsync(ct); return null; }
        catch (DbUpdateConcurrencyException) { return Changed(); }
    }

    private static ServiceError Changed() => new(ServiceErrorKind.Conflict, "CONTENT_VERSION_CHANGED",
        "The content version changed. Reload it and retry with the latest revision.");
    private static ServiceError Missing(Guid id) => new(ServiceErrorKind.NotFound, "CONTENT_VERSION_NOT_FOUND",
        $"ContentVersion '{id}' was not found.");
    private static ServiceError Invalid(string field, string message) => new(ServiceErrorKind.Validation,
        "VALIDATION_FAILED", "One or more validation errors occurred.", new Dictionary<string, string[]> { [field] = [message] });
    private static ServiceError? CheckMetadata(string label, string schemaVersion)
    {
        if (string.IsNullOrWhiteSpace(label) || label.Trim().Length > 200)
            return Invalid("Label", "Label must contain 1-200 non-blank characters.");
        if (schemaVersion != "1.0") return Invalid("SchemaVersion", "Only schema version 1.0 is supported.");
        return null;
    }

    private static IEnumerable<ContentValidationIssue> ReferenceErrors(ContentVersion version)
    {
        var rows = ContentBundleBuilder.ContentRows(version).ToArray();
        var ids = rows.Select(r => r.Id).Append(version.Id).ToHashSet();
        foreach (var row in rows)
            foreach (var property in row.GetType().GetProperties().Where(p => p.Name != nameof(BaseEntity.Id)
                && (p.PropertyType == typeof(Guid) || p.PropertyType == typeof(Guid?))))
                if (property.GetValue(row) is Guid id && !ids.Contains(id))
                    yield return new($"/{JsonNamingPolicy.SnakeCaseLower.ConvertName(row.GetType().Name)}/{row.Id}/{property.Name}",
                        "Reference belongs to another content version or is missing.");
    }

    private static ContentVersionDto ToDto(ContentVersion v) => new(v.Id, v.VersionNo, v.Label, v.Changelog,
        v.ParentVersionId, v.Status.ToString(), v.Revision, v.SchemaVersion, v.AuthoredById,
        v.CreatedAt, v.UpdatedAt, v.ValidatedAt, v.BundleChecksum,
        v.ValidationErrors == null ? [] : JsonSerializer.Deserialize<ContentValidationIssue[]>(v.ValidationErrors, JsonSerializerOptions.Web) ?? [],
        v.SubmittedAt, v.ReviewedById, v.ReviewedAt, v.ReviewNote, v.PublishedById, v.PublishedAt);

    // Copy scalar content, generate new identities and remap every FK into the new snapshot.
    // Navigation properties are reconstructed by EF relationship fixup when the rows are added.
    private static ServiceResult<IReadOnlyList<BaseEntity>> CloneContent(ContentVersion source, ContentVersion target)
    {
        var rows = ContentBundleBuilder.ContentRows(source).ToArray();
        var ids = rows.ToDictionary(r => r.Id, _ => Guid.CreateVersion7());
        ids.Add(source.Id, target.Id);
        var copies = new List<BaseEntity>();
        foreach (var row in rows)
        {
            var copy = (BaseEntity)Activator.CreateInstance(row.GetType())!;
            foreach (var property in row.GetType().GetProperties())
            {
                if (property.Name is nameof(BaseEntity.CreatedAt) or nameof(BaseEntity.UpdatedAt)) continue;
                if (property.PropertyType == typeof(Guid) || property.PropertyType == typeof(Guid?))
                {
                    var value = (Guid?)property.GetValue(row);
                    if (value == null) property.SetValue(copy, null);
                    else if (ids.TryGetValue(value.Value, out var remapped)) property.SetValue(copy, remapped);
                    else return Invalid("ParentVersionId", "Source content contains a reference to another content version.");
                }
                else if (property.PropertyType.IsValueType || property.PropertyType == typeof(string))
                    property.SetValue(copy, property.GetValue(row));
                else if (property.PropertyType == typeof(List<string>))
                    property.SetValue(copy, new List<string>((List<string>)property.GetValue(row)!));
            }
            copies.Add(copy);
        }
        return copies;
    }

    public static string CanonicalJson(JsonNode? node) => node switch
    {
        JsonObject obj => "{" + string.Join(",", obj.OrderBy(p => p.Key, StringComparer.Ordinal)
            .Select(p => JsonSerializer.Serialize(p.Key) + ":" + CanonicalJson(p.Value))) + "}",
        JsonArray array => "[" + string.Join(",", array.Select(CanonicalJson)) + "]",
        null => "null",
        JsonValue value when JsonSerializer.SerializeToElement(value) is { ValueKind: JsonValueKind.Number } number
            && number.TryGetDecimal(out var numeric) => numeric.ToString("G29", CultureInfo.InvariantCulture),
        _ => node.ToJsonString()
    };
}
