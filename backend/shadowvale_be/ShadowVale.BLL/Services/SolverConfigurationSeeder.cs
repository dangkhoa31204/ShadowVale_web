using Microsoft.Extensions.Logging;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Mappings;
using ShadowVale.BLL.Validators;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services;

// Creates one configuration per runnable solver variant when the table is empty (first start).
// Parameters are the tuned values from shadowvale-solver/experiments/tuning/tuned.json (protocol: 120 ms budget);
// greedy has none and QAOA was not tuned, so it keeps the solver defaults.
// Only greedy (classical baseline) and sqa (quantum-inspired) start active; Admins change that in the web app.
public class SolverConfigurationSeeder(
    ISolverConfigurationRepository configurations,
    ILogger<SolverConfigurationSeeder> logger) : ISolverConfigurationSeeder
{
    private const int TimeBudgetMs = 120;

    private static readonly (string Code, string Name, SolverAlgorithm Algorithm, string Library, string Params, bool Active)[] Seeds =
    [
        ("greedy", "Greedy (classical baseline)", SolverAlgorithm.Greedy, "custom", "{}", true),
        ("ga", "Genetic algorithm (tuned)", SolverAlgorithm.Genetic, "custom",
            """{"elite": 6, "mutation": 0.10512953207506336, "population": 76, "tournament": 5}""", false),
        ("sa", "Simulated annealing (neal)", SolverAlgorithm.ClassicalSa, "dwave-neal", "{}", false),
        ("sqa", "Simulated quantum annealing (tuned)", SolverAlgorithm.Sqa, "custom",
            """{"gamma_end": 0.020434980033166756, "gamma_start": 5.364582871902586, "temperature": 0.012739864531486577, "trotter": 16}""", true),
        ("qiea", "Quantum-inspired evolutionary (tuned)", SolverAlgorithm.Qiea, "custom",
            """{"delta": 0.15834993579413878, "margin": 0.2710769709743299, "population": 29}""", false),
        ("qaoa", "QAOA (numpy simulation)", SolverAlgorithm.Qaoa, "numpy", "{}", false)
    ];

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await configurations.AnyAsync(ct))
            return;

        var (_, weights) = SolverParamsValidator.Validate(SolverAlgorithm.Greedy, null, null);
        foreach (var seed in Seeds)
        {
            await configurations.AddAsync(new SolverConfiguration
            {
                Code = seed.Code,
                Name = seed.Name,
                Algorithm = seed.Algorithm,
                Family = seed.Algorithm.Family(),
                Library = seed.Library,
                Params = seed.Params,
                QuboWeights = weights,
                TimeBudgetMs = TimeBudgetMs,
                IsActive = seed.Active
            }, ct);
        }

        await configurations.SaveChangesAsync(ct);
        logger.LogInformation("Seeded {Count} solver configurations", Seeds.Length);
    }
}
