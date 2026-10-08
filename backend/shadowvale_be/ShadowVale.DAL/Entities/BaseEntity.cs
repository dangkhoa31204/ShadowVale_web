namespace ShadowVale.DAL.Entities;

public abstract class BaseEntity
{
    // Time-ordered (v7) GUIDs keep inserts at the end of the primary-key index
    public Guid Id { get; set; } = Guid.CreateVersion7();

    // Npgsql maps DateTime to timestamptz, which only accepts UTC values
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
