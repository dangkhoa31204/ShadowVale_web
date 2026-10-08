namespace ShadowVale.BLL.Interfaces;

public interface IAdminSeeder
{
    Task SeedAsync(CancellationToken ct = default);
}
