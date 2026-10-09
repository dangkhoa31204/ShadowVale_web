using System.ComponentModel.DataAnnotations;

namespace ShadowVale.BLL.DTOs.Content;

public sealed record ReviewContentVersionRequest
{
    [Required, Range(0, long.MaxValue)] public long? Revision { get; init; }
    [MaxLength(2000)] public string? ReviewNote { get; init; }
}

public sealed record PublishContentVersionRequest
{
    [Required, Range(0, long.MaxValue)] public long? Revision { get; init; }
    [Required, MaxLength(500)] public string Reason { get; init; } = "";
}

public sealed record ContentPublicationQuery
{
    public Guid? ContentVersionId { get; init; }
    [Range(1, 1000000)] public int Page { get; init; } = 1;
    [Range(1, 100)] public int PageSize { get; init; } = 20;
}

public sealed record ContentPublicationDto(Guid Id, Guid ContentVersionId, Guid? PreviousVersionId,
    string Action, Guid? ActorId, string Reason, DateTime CreatedAt);
