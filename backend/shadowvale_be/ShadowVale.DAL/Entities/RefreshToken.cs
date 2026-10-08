namespace ShadowVale.DAL.Entities;

// One row per login session. Only the SHA-256 hash is stored, so a database leak does not leak usable tokens.
public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string TokenHash { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}
