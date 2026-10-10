using ShadowVale.BLL.DTOs.Game;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Interfaces;
using ShadowVale.Contracts.Game;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services;

// Serves published content to the game. Building and publishing bundles belongs to the content module.
public class GameContentService(IGameContentRepository content) : IGameContentService
{
    public async Task<ContentManifest> GetManifestAsync(CancellationToken ct = default)
    {
        var manifest = await content.GetPublishedManifestAsync(ct) ?? throw NothingPublished();
        return new ContentManifest
        {
            VersionId = manifest.Id,
            VersionNo = manifest.VersionNo,
            Label = manifest.Label,
            SchemaVersion = manifest.SchemaVersion,
            Checksum = manifest.Checksum,
            PublishedAt = new DateTimeOffset(manifest.PublishedAt, TimeSpan.Zero)
        };
    }

    public async Task<GameBundle> GetPublishedBundleAsync(CancellationToken ct = default)
    {
        var bundle = await content.GetPublishedBundleAsync(ct) ?? throw NothingPublished();
        return new GameBundle(bundle.Checksum, bundle.Bundle);
    }

    public async Task<GameBundle> GetVersionBundleAsync(Guid versionId, CancellationToken ct = default)
    {
        var bundle = await content.GetEverPublishedBundleAsync(versionId, ct)
            ?? throw new NotFoundException($"Content version '{versionId}' was not found or was never published.");
        return new GameBundle(bundle.Checksum, bundle.Bundle);
    }

    private static NotFoundException NothingPublished() => new("No content version is published yet.");
}
