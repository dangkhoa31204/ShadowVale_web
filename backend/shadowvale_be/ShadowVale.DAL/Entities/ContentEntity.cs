namespace ShadowVale.DAL.Entities;

// Base for content a designer authors (items, maps, quests...). Every row belongs to one content version,
// and Code ("rifle_ak", "map_01") is unique inside that version, so two versions can be diffed by Code.
public abstract class ContentEntity : BaseEntity
{
    public Guid ContentVersionId { get; set; }
    public ContentVersion ContentVersion { get; set; } = null!;

    public string Code { get; set; } = null!;
}
