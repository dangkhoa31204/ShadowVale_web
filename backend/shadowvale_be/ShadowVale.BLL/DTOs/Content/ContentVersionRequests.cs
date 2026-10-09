using System.ComponentModel.DataAnnotations;

namespace ShadowVale.BLL.DTOs.Content;

public sealed record ContentVersionQuery
{
    [MaxLength(200)] public string? Search { get; init; }
    public string? Status { get; init; }
    [Range(1, 1000000)] public int Page { get; init; } = 1;
    [Range(1, 100)] public int PageSize { get; init; } = 20;
}

public sealed record CreateContentVersionRequest
{
    [Required, MaxLength(200)] public string Label { get; init; } = "";
    public string? Changelog { get; init; }
    public Guid? ParentVersionId { get; init; }
    [Required, MaxLength(20)] public string SchemaVersion { get; init; } = "1.0";
}

public sealed record UpdateContentVersionRequest
{
    [Required, MaxLength(200)] public string Label { get; init; } = "";
    public string? Changelog { get; init; }
    [Required, MaxLength(20)] public string SchemaVersion { get; init; } = "1.0";
    [Required, Range(0, long.MaxValue)] public long? Revision { get; init; }
}

public sealed record ValidateContentVersionRequest
{
    [Required, Range(0, long.MaxValue)] public long? Revision { get; init; }
}

public sealed record DeleteContentVersionRequest
{
    [Required, Range(0, long.MaxValue)] public long? Revision { get; init; }
}
