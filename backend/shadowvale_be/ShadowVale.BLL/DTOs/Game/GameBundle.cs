namespace ShadowVale.BLL.DTOs.Game;

// Bundle JSON exactly as served, with the SHA-256 (hex) of that text (used as ETag)
public sealed record GameBundle(string Checksum, string Json);
