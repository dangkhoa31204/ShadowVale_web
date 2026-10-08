namespace ShadowVale.DAL.Entities;

public class User : BaseEntity
{
    // Username and Email are stored lower-cased so uniqueness and lookups are case-insensitive
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string? FullName { get; set; }
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
