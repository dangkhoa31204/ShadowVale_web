using System.Text.Json;

namespace ShadowVale.BLL.DTOs.Content;

public sealed record ContentVersionDto(Guid Id, long VersionNo, string Label, string? Changelog,
    Guid? ParentVersionId, string Status, long Revision, string SchemaVersion, Guid AuthoredById,
    DateTime CreatedAt, DateTime UpdatedAt, DateTime? ValidatedAt, string? BundleChecksum,
    IReadOnlyList<ContentValidationIssue> ValidationErrors);

public sealed record ContentVersionDetailsDto(ContentVersionDto Version, JsonElement Bundle);
public sealed record ContentValidationIssue(string Path, string Message);
public sealed record ContentValidationResultDto(Guid Id, long Revision, bool IsValid,
    DateTime ValidatedAt, string? BundleChecksum, IReadOnlyList<ContentValidationIssue> Errors);
public sealed record ContentDifferenceDto(string Path, JsonElement? Before, JsonElement? After);
public sealed record ContentComparisonDto(Guid SourceId, long SourceRevision, Guid TargetId,
    long TargetRevision, IReadOnlyList<ContentDifferenceDto> Differences);
