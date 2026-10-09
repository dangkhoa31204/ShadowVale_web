using System.ComponentModel.DataAnnotations.Schema;

namespace ShadowVale.DAL.Repositories.Interfaces;

// Raw SQL rows: column names are explicit so they do not depend on the naming convention.
// Checksum = SHA-256 (hex) of the bundle text exactly as Postgres returns it, computed in SQL so it always matches
// the bytes served, whatever the publishing code stored in bundle_checksum.
public sealed record PublishedManifest(
    [property: Column("id")] Guid Id,
    [property: Column("version_no")] long VersionNo,
    [property: Column("label")] string Label,
    [property: Column("schema_version")] string SchemaVersion,
    [property: Column("checksum")] string Checksum,
    [property: Column("published_at")] DateTime PublishedAt);

public sealed record BundleContent(
    [property: Column("checksum")] string Checksum,
    [property: Column("bundle")] string Bundle);

// Read-only access to published content for the game (authoring and publishing belong to the content module)
public interface IGameContentRepository
{
    // The single version with status Published
    Task<PublishedManifest?> GetPublishedManifestAsync(CancellationToken ct = default);
    Task<BundleContent?> GetPublishedBundleAsync(CancellationToken ct = default);

    // Any version that was published at some point (current or archived), for replaying old sessions
    Task<BundleContent?> GetEverPublishedBundleAsync(Guid versionId, CancellationToken ct = default);

    Task<bool> VersionExistsAsync(Guid versionId, CancellationToken ct = default);
}
