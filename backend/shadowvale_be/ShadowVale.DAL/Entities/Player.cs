namespace ShadowVale.DAL.Entities;

// Anonymous game install (the game has no login). No personal data.
public class Player : BaseEntity
{
    // Generated once by the game on first launch and kept on disk
    public Guid InstallId { get; set; }
    public DateTime? LastSeenAt { get; set; }

    public ICollection<GameSession> Sessions { get; set; } = [];
}
