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
                BundleChecksum = v.BundleChecksum, ValidationErrors = v.ValidationErrors
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
}
