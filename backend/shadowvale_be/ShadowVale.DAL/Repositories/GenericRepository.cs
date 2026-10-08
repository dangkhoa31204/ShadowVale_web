using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.DAL.Repositories;

public class GenericRepository<T>(ShadowValeDbContext context) : IGenericRepository<T> where T : BaseEntity
{
    protected readonly ShadowValeDbContext Context = context;
    protected readonly DbSet<T> DbSet = context.Set<T>();

    public IQueryable<T> Query() => DbSet.AsQueryable();

    public Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        DbSet.FirstOrDefaultAsync(e => e.Id == id, ct);

    public Task<List<T>> GetAllAsync(CancellationToken ct = default) =>
        DbSet.AsNoTracking().ToListAsync(ct);

    public async Task AddAsync(T entity, CancellationToken ct = default) =>
        await DbSet.AddAsync(entity, ct);

    public void Update(T entity) => DbSet.Update(entity);

    public void Remove(T entity) => DbSet.Remove(entity);

    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        Context.SaveChangesAsync(ct);
}
