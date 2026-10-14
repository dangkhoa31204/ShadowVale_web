using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.DAL.Repositories;

public class GameContentRepository(ShadowValeDbContext context) : IGameContentRepository
{
    public async Task<PublishedManifest?> GetPublishedManifestAsync(CancellationToken ct = default)
    {
        var rows = await context.Database.SqlQuery<PublishedManifest>($"""
            SELECT id, version_no, label, schema_version,
                   encode(sha256(convert_to(bundle::text, 'UTF8')), 'hex') AS checksum, published_at
            FROM shadowvale.content_versions
            WHERE status = 'Published' AND bundle IS NOT NULL AND published_at IS NOT NULL
            """).ToListAsync(ct);
        return rows.FirstOrDefault();
    }

    public async Task<BundleContent?> GetPublishedBundleAsync(CancellationToken ct = default)
    {
        var rows = await context.Database.SqlQuery<BundleContent>($"""
            SELECT encode(sha256(convert_to(bundle::text, 'UTF8')), 'hex') AS checksum, bundle::text AS bundle
            FROM shadowvale.content_versions
            WHERE status = 'Published' AND bundle IS NOT NULL AND published_at IS NOT NULL
            """).ToListAsync(ct);
        return rows.FirstOrDefault();
    }

    public async Task<BundleContent?> GetEverPublishedBundleAsync(Guid versionId, CancellationToken ct = default)
    {
        var rows = await context.Database.SqlQuery<BundleContent>($"""
            SELECT encode(sha256(convert_to(bundle::text, 'UTF8')), 'hex') AS checksum, bundle::text AS bundle
            FROM shadowvale.content_versions
            WHERE id = {versionId} AND bundle IS NOT NULL AND published_at IS NOT NULL
            """).ToListAsync(ct);
        return rows.FirstOrDefault();
    }

    public Task<bool> VersionExistsAsync(Guid versionId, CancellationToken ct = default) =>
        context.ContentVersions.AnyAsync(v => v.Id == versionId, ct);

    public async Task<IReadOnlyList<PublishedVersionRow>> GetEverPublishedVersionsAsync(CancellationToken ct = default) =>
        await context.ContentVersions.AsNoTracking()
            .Where(v => v.PublishedAt != null && v.Bundle != null)
            .OrderByDescending(v => v.VersionNo)
            .Select(v => new PublishedVersionRow(v.Id, v.VersionNo, v.Label, v.PublishedAt!.Value, v.Status == ContentStatus.Published))
            .ToListAsync(ct);
}
