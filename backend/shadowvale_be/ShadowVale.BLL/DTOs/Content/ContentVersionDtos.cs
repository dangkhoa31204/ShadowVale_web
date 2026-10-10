using System.ComponentModel.DataAnnotations;

namespace ShadowVale.BLL.DTOs.Content;

public sealed record UserRefDto(Guid Id, string Username);

// One problem found while validating a version. Path points at the row, e.g. "items[rifle_ak].weapon".
public sealed record ContentIssueDto(string Path, string Message);

public sealed record ContentCountsDto(int Items, int Skills, int LootTables, int EnemyTypes, int Maps, int CraftingRecipes, int Quests);

public sealed record ContentVersionDto(
    Guid Id,
    long VersionNo,
    string Label,
    string? Changelog,
    Guid? ParentVersionId,
    string Status,
    long Revision,
    string SchemaVersion,
    // True when the version was validated since its last edit: a bundle is built and stored
    bool IsValidated,
    DateTime? ValidatedAt,
    string? BundleChecksum,
    IReadOnlyList<ContentIssueDto>? ValidationErrors,
    UserRefDto AuthoredBy,
    DateTime? SubmittedAt,
    UserRefDto? ReviewedBy,
    DateTime? ReviewedAt,
    string? ReviewNote,
    UserRefDto? PublishedBy,
    DateTime? PublishedAt,
    DateTime? ArchivedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    // Only on GET {id}
    ContentCountsDto? Counts);

public sealed record ContentVersionQuery
{
    public string? Status { get; init; }
    [Range(1, int.MaxValue)] public int Page { get; init; } = 1;
    [Range(1, 100)] public int PageSize { get; init; } = 20;
}

public sealed record CreateContentVersionRequest
{
    [Required, MaxLength(200)] public string Label { get; init; } = "";
    [MaxLength(4000)] public string? Changelog { get; init; }

    // Copy all content of this version into the new one (it becomes the parent, for compare). Null = start empty.
    public Guid? BaseVersionId { get; init; }
}

public sealed record UpdateContentVersionRequest
{
    [Required, MaxLength(200)] public string Label { get; init; } = "";
    [MaxLength(4000)] public string? Changelog { get; init; }
}

public sealed record ReviewNoteRequest
{
    [MaxLength(2000)] public string? Note { get; init; }
}

public sealed record RejectContentVersionRequest
{
    [Required, MaxLength(2000)] public string Note { get; init; } = "";
}

public sealed record PublishContentVersionRequest
{
    [MaxLength(500)] public string? Reason { get; init; }
}

public sealed record RollbackContentVersionRequest
{
    [Required, MaxLength(500)] public string Reason { get; init; } = "";
}

public sealed record ValidationReportDto(
    bool IsValid,
    IReadOnlyList<ContentIssueDto> Issues,
    string? BundleChecksum,
    ContentCountsDto Counts);

public sealed record PublicationHistoryDto(
    Guid Id,
    string Action,
    Guid ContentVersionId,
    long ContentVersionNo,
    string ContentVersionLabel,
    Guid? PreviousVersionId,
    long? PreviousVersionNo,
    Guid? ActorId,
    string? ActorName,
    string Reason,
    DateTime CreatedAt);

public sealed record ChangedEntryDto(string Id, IReadOnlyList<string> Fields);

public sealed record SectionDiffDto(
    string Section,
    IReadOnlyList<string> Added,
    IReadOnlyList<string> Removed,
    IReadOnlyList<ChangedEntryDto> Changed);

public sealed record VersionRefDto(Guid Id, long VersionNo, string Label);

// What changed going from version A to version B
public sealed record ContentCompareDto(VersionRefDto A, VersionRefDto B, bool HasChanges, IReadOnlyList<SectionDiffDto> Sections);

public sealed record HistoryQuery
{
    [Range(1, int.MaxValue)] public int Page { get; init; } = 1;
    [Range(1, 100)] public int PageSize { get; init; } = 20;
}
