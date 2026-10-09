namespace ShadowVale.BLL.Interfaces;

public interface IDemoDataSeeder
{
    Task SeedAsync(CancellationToken ct = default);
}
