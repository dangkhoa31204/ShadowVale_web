namespace ShadowVale.DAL.Entities;

// Append-only log of publish / rollback actions. CreatedAt is when it happened.
public class ContentPublicationHistory : BaseEntity
{
    public Guid ContentVersionId { get; set; }
    public ContentVersion ContentVersion { get; set; } = null!;

    // Version that was published before (null for the very first publish)
    public Guid? PreviousVersionId { get; set; }
    public ContentVersion? PreviousVersion { get; set; }

    public PublishAction Action { get; set; }

    public Guid? ActorId { get; set; }
    public User? Actor { get; set; }

    public string Reason { get; set; } = null!;
}
