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

    // Content & balancing platform (one snapshot per ContentVersion)
    public DbSet<ContentVersion> ContentVersions => Set<ContentVersion>();
    public DbSet<ContentPublicationHistory> ContentPublicationHistory => Set<ContentPublicationHistory>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<Weapon> Weapons => Set<Weapon>();
    public DbSet<Consumable> Consumables => Set<Consumable>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<LootTable> LootTables => Set<LootTable>();
    public DbSet<LootTableEntry> LootTableEntries => Set<LootTableEntry>();
    public DbSet<EnemyType> EnemyTypes => Set<EnemyType>();
    public DbSet<Map> Maps => Set<Map>();
    public DbSet<MapLootTable> MapLootTables => Set<MapLootTable>();
    public DbSet<EnemyPlacement> EnemyPlacements => Set<EnemyPlacement>();
    public DbSet<CraftingRecipe> CraftingRecipes => Set<CraftingRecipe>();
    public DbSet<CraftingRecipeIngredient> CraftingRecipeIngredients => Set<CraftingRecipeIngredient>();
    public DbSet<Quest> Quests => Set<Quest>();
    public DbSet<QuestReward> QuestRewards => Set<QuestReward>();

    // Telemetry & solver comparison
    public DbSet<Player> Players => Set<Player>();
    public DbSet<SolverConfiguration> SolverConfigurations => Set<SolverConfiguration>();
    public DbSet<GameSession> GameSessions => Set<GameSession>();
    public DbSet<TelemetryEvent> TelemetryEvents => Set<TelemetryEvent>();
    public DbSet<CoordinationResult> CoordinationResults => Set<CoordinationResult>();

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
