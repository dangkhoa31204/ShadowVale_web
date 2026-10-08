using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data;

public class ShadowValeDbContext(DbContextOptions<ShadowValeDbContext> options) : DbContext(options)
{
    // Tables live in their own schema instead of "public": Supabase exposes "public"
    // through its auto-generated REST API (anon key), which this project does not use.
    public const string Schema = "shadowvale";

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ShadowValeDbContext).Assembly);
    }

    // Every SaveChanges/SaveChangesAsync overload funnels into these two
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        StampTimestamps();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        StampTimestamps();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void StampTimestamps()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
    }
}
