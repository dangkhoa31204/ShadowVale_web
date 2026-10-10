using ShadowVale.BLL.DTOs.Solvers;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Mappings;
using ShadowVale.BLL.Validators;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services;

// Solver configurations compared in the research. Rules that keep the comparison valid:
// - a configuration that was used (sessions or results point at it) is frozen except for its name: clone it instead;
// - every active configuration shares the same latency budget and QUBO weights, so A/B arms differ only by algorithm.
public class SolverConfigurationService(ISolverConfigurationRepository configurations) : ISolverConfigurationService
{
    public async Task<IReadOnlyList<SolverConfigurationDto>> GetAllAsync(SolverConfigurationQuery query, CancellationToken ct = default)
    {
        var family = EnumParsing.ParseOptional<SolverFamily>(query.Family, nameof(query.Family));
        var algorithm = EnumParsing.ParseOptional<SolverAlgorithm>(query.Algorithm, nameof(query.Algorithm));

        var items = await configurations.SearchAsync(family, algorithm, query.IsActive, ct);
        return items.Select(u => u.ToDto()).ToList();
    }

    public async Task<SolverConfigurationDto> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        (await FindUsageAsync(id, ct)).ToDto();

    public async Task<SolverConfigurationDto> CreateAsync(CreateSolverConfigurationRequest request, CancellationToken ct = default)
    {
        var algorithm = EnumParsing.Parse<SolverAlgorithm>(request.Algorithm, nameof(request.Algorithm));
        var (parameters, weights) = SolverParamsValidator.Validate(algorithm, request.Params, request.QuboWeights);
        await EnsureCodeFreeAsync(request.Code, ct);

        // Created inactive: it joins the A/B test only when switched on (which checks fairness)
        var configuration = new SolverConfiguration
        {
            Code = request.Code,
            Name = request.Name.Trim(),
            Algorithm = algorithm,
            Family = algorithm.Family(),
            Library = request.Library?.Trim(),
            Params = parameters,
            QuboWeights = weights,
            TimeBudgetMs = request.TimeBudgetMs,
            IsActive = false
        };

        return await AddAsync(configuration, ct);
    }

    public async Task<SolverConfigurationDto> UpdateAsync(Guid id, UpdateSolverConfigurationRequest request, CancellationToken ct = default)
    {
        var usage = await FindUsageAsync(id, ct);
        var configuration = await FindAsync(id, ct);
        var (parameters, weights) = SolverParamsValidator.Validate(configuration.Algorithm, request.Params, request.QuboWeights);
        var library = request.Library?.Trim();

        var settingsChanged = configuration.Library != library
            || !SameJson(configuration.Params, parameters)
            || !SolverParamsValidator.SameWeights(configuration.QuboWeights, weights)
            || configuration.TimeBudgetMs != request.TimeBudgetMs;

        if (settingsChanged && usage.IsUsed)
            throw new ConflictException(
                $"Solver configuration '{configuration.Code}' already has recorded sessions or results, so only its name can change. " +
                "Clone it to try other settings.");

        configuration.Name = request.Name.Trim();
        configuration.Library = library;
        configuration.Params = parameters;
        configuration.QuboWeights = weights;
        configuration.TimeBudgetMs = request.TimeBudgetMs;

        if (configuration.IsActive)
            await EnsureFairAsync(configuration, ct);

        await DatabaseErrors.GuardAsync(() => configurations.SaveChangesAsync(ct));
        return (usage with { Configuration = configuration }).ToDto();
    }

    public async Task<SolverConfigurationDto> CloneAsync(Guid id, CloneSolverConfigurationRequest request, CancellationToken ct = default)
    {
        var source = await FindAsync(id, ct);
        await EnsureCodeFreeAsync(request.Code, ct);

        var clone = new SolverConfiguration
        {
            Code = request.Code,
            Name = request.Name.Trim(),
            Algorithm = source.Algorithm,
            Family = source.Family,
            Library = source.Library,
            Params = source.Params,
            QuboWeights = source.QuboWeights,
            TimeBudgetMs = source.TimeBudgetMs,
            IsActive = false
        };

        return await AddAsync(clone, ct);
    }

    public async Task<SolverConfigurationDto> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default)
    {
        var configuration = await FindAsync(id, ct);

        if (isActive && !configuration.IsActive)
        {
            await EnsureFairAsync(configuration, ct);
            configuration.IsActive = true;
        }
        else if (!isActive)
        {
            configuration.IsActive = false;
        }

        await configurations.SaveChangesAsync(ct);
        return (await FindUsageAsync(id, ct)).ToDto();
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var usage = await FindUsageAsync(id, ct);
        if (usage.IsUsed)
            throw new ConflictException(
                $"Solver configuration '{usage.Configuration.Code}' has recorded sessions or results and cannot be deleted. Deactivate it instead.");

        configurations.Remove(await FindAsync(id, ct));
        // A session may have been assigned it in the meantime: the foreign key then refuses the delete (409)
        await DatabaseErrors.GuardAsync(() => configurations.SaveChangesAsync(ct));
    }

    // Every active configuration must share the latency budget and QUBO weights with this one
    private async Task EnsureFairAsync(SolverConfiguration configuration, CancellationToken ct)
    {
        var others = (await configurations.GetActiveAsync(ct)).Where(c => c.Id != configuration.Id).ToList();
        var mismatch = others.FirstOrDefault(c =>
            c.TimeBudgetMs != configuration.TimeBudgetMs || !SolverParamsValidator.SameWeights(c.QuboWeights, configuration.QuboWeights));

        if (mismatch is not null)
            throw new ConflictException(
                $"Active solver configurations must share the same timeBudgetMs and quboWeights for a fair comparison, " +
                $"but '{mismatch.Code}' uses {mismatch.TimeBudgetMs} ms and {mismatch.QuboWeights}. " +
                "Align the settings or deactivate the other configuration first.");
    }

    private async Task EnsureCodeFreeAsync(string code, CancellationToken ct)
    {
        if (await configurations.CodeExistsAsync(code, ct))
            throw new ConflictException($"Solver configuration code '{code}' is already taken.");
    }

    private async Task<SolverConfigurationDto> AddAsync(SolverConfiguration configuration, CancellationToken ct)
    {
        await configurations.AddAsync(configuration, ct);
        // Two requests racing for the same code: the unique index turns the loser into a 409
        await DatabaseErrors.GuardAsync(() => configurations.SaveChangesAsync(ct));
        return new SolverConfigurationUsage(configuration, 0, 0).ToDto();
    }

    private async Task<SolverConfiguration> FindAsync(Guid id, CancellationToken ct) =>
        await configurations.GetByIdAsync(id, ct) ?? throw new NotFoundException("Solver configuration", id);

    private async Task<SolverConfigurationUsage> FindUsageAsync(Guid id, CancellationToken ct) =>
        await configurations.GetUsageAsync(id, ct) ?? throw new NotFoundException("Solver configuration", id);

    private static bool SameJson(string a, string b) =>
        System.Text.Json.Nodes.JsonNode.DeepEquals(System.Text.Json.Nodes.JsonNode.Parse(a), System.Text.Json.Nodes.JsonNode.Parse(b));
}
