using System.Data;
using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.DAL.Repositories;

public class ContentVersionRepository(ShadowValeDbContext context)
    : GenericRepository<ContentVersion>(context), IContentVersionRepository
{
    public async Task<(List<ContentVersion> Items, int Total)> SearchAsync(string? search, ContentStatus? status,
        int page, int pageSize, CancellationToken ct = default)
    {
        var query = DbSet.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(v => v.Label.ToLower().Contains(term));
        }
        if (status.HasValue) query = query.Where(v => v.Status == status.Value);
        else query = query.Where(v => v.Status != ContentStatus.Archived);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(v => v.VersionNo)
            .Skip((page - 1) * pageSize).Take(pageSize)
            // Bundle JSON can be large; the list only needs metadata.
            .Select(v => new ContentVersion
            {
                Id = v.Id, VersionNo = v.VersionNo, Label = v.Label, Changelog = v.Changelog,
                ParentVersionId = v.ParentVersionId, Status = v.Status, Revision = v.Revision,
                SchemaVersion = v.SchemaVersion, AuthoredById = v.AuthoredById,
                CreatedAt = v.CreatedAt, UpdatedAt = v.UpdatedAt, ValidatedAt = v.ValidatedAt,
                BundleChecksum = v.BundleChecksum, ValidationErrors = v.ValidationErrors,
                SubmittedAt = v.SubmittedAt, ReviewedById = v.ReviewedById, ReviewedAt = v.ReviewedAt,
                ReviewNote = v.ReviewNote, PublishedById = v.PublishedById, PublishedAt = v.PublishedAt
            }).ToListAsync(ct);
        return (items, total);
    }

    public async Task<ContentVersion?> GetSnapshotAsync(Guid id, CancellationToken ct = default)
    {
        // Split queries must see one consistent revision across all content tables.
        await using var transaction = await Context.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        var snapshot = await DbSet.AsNoTrackingWithIdentityResolution().AsSplitQuery()
            .Include(v => v.Items).ThenInclude(i => i.Weapon)
            .Include(v => v.Items).ThenInclude(i => i.Consumable)
            .Include(v => v.Skills)
            .Include(v => v.LootTables).ThenInclude(t => t.Entries)
            .Include(v => v.EnemyTypes)
            .Include(v => v.Maps).ThenInclude(m => m.EnemyPlacements)
            .Include(v => v.Maps).ThenInclude(m => m.LootTables)
            .Include(v => v.CraftingRecipes).ThenInclude(r => r.Ingredients)
            .Include(v => v.Quests).ThenInclude(q => q.Rewards)
            .SingleOrDefaultAsync(v => v.Id == id, ct);
        await transaction.CommitAsync(ct);
        return snapshot;
    }

    public void AddContent(IEnumerable<BaseEntity> entities) => Context.AddRange(entities);

    public Task PublishAsync(ContentVersion version, Guid actorId, string reason, DateTime publishedAt,
        CancellationToken ct = default) => GoLiveAsync(version, PublishAction.Publish, actorId, reason, publishedAt, ct);

    public Task RollbackAsync(ContentVersion version, Guid actorId, string reason, DateTime publishedAt,
        CancellationToken ct = default) => GoLiveAsync(version, PublishAction.Rollback, actorId, reason, publishedAt, ct);

    // Makes the version the single Published one; the version it replaces is archived in the same transaction
    private async Task GoLiveAsync(ContentVersion version, PublishAction action, Guid actorId, string reason,
        DateTime publishedAt, CancellationToken ct)
    {
        await using var transaction = await Context.Database.BeginTransactionAsync(ct);
        // Serialize publication operations, including the first publication with no existing row to lock.
        await Context.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(734021986)", ct);
        var previous = await DbSet.SingleOrDefaultAsync(v => v.Status == ContentStatus.Published, ct);
        if (previous is not null)
        {
            if (previous.Revision == long.MaxValue)
                throw new DbUpdateConcurrencyException("The published version revision cannot be incremented.");
            previous.Status = ContentStatus.Archived;
            previous.ArchivedAt = publishedAt;
            previous.Revision = checked(previous.Revision + 1);
            // Release the partial unique index before promotion, within the same transaction.
            await Context.SaveChangesAsync(ct);
        }
        version.Status = ContentStatus.Published;
        version.PublishedById = actorId;
        version.PublishedAt = publishedAt;
        version.ArchivedAt = null;
        version.Revision = checked(version.Revision + 1);
        Context.ContentPublicationHistory.Add(new ContentPublicationHistory
        {
            ContentVersionId = version.Id, PreviousVersionId = previous?.Id,
            Action = action, ActorId = actorId, Reason = reason
        });
        await Context.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public async Task<(List<ContentPublicationHistory> Items, int Total)> SearchPublicationsAsync(
        Guid? versionId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = Context.ContentPublicationHistory.AsNoTracking();
        if (versionId.HasValue) query = query.Where(h => h.ContentVersionId == versionId.Value);
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(h => h.CreatedAt).ThenByDescending(h => h.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            // Only the names needed to display a row; the versions' bundle JSON stays in the database.
            .Select(h => new ContentPublicationHistory
            {
                Id = h.Id, ContentVersionId = h.ContentVersionId, PreviousVersionId = h.PreviousVersionId,
                Action = h.Action, ActorId = h.ActorId, Reason = h.Reason, CreatedAt = h.CreatedAt,
                ContentVersion = new ContentVersion { VersionNo = h.ContentVersion.VersionNo, Label = h.ContentVersion.Label },
                PreviousVersion = h.PreviousVersion == null ? null
                    : new ContentVersion { VersionNo = h.PreviousVersion.VersionNo, Label = h.PreviousVersion.Label },
                Actor = h.Actor == null ? null : new User { Username = h.Actor.Username }
            }).ToListAsync(ct);
        return (items, total);
    }
}
