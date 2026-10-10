using System;

namespace ShadowVale.Contracts.Game
{
    // GET /api/game/content/manifest: what the published content is, so the game downloads the bundle only when it changed
    public class ContentManifest
    {
        public Guid VersionId { get; set; }
        public long VersionNo { get; set; }
        public string Label { get; set; } = "";
        public string SchemaVersion { get; set; } = "";

        // SHA-256 (hex) of the bundle exactly as GET content/bundle returns it; also that response's ETag
        public string Checksum { get; set; } = "";
        public DateTimeOffset PublishedAt { get; set; }
    }
}
