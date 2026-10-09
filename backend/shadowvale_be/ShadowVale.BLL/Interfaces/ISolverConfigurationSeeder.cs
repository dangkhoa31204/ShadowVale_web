namespace ShadowVale.BLL.Interfaces;

public interface ISolverConfigurationSeeder
{
    Task SeedAsync(CancellationToken ct = default);
}
