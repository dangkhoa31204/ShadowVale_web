using System.Text.Json;
using NSubstitute;
using ShadowVale.BLL.DTOs.Solvers;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Services;
using ShadowVale.BLL.Validators;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class SolverConfigurationServiceTests
{
    private readonly ISolverConfigurationRepository _configurations = Substitute.For<ISolverConfigurationRepository>();
    private readonly SolverConfigurationService _sut;

    public SolverConfigurationServiceTests()
    {
        _sut = new SolverConfigurationService(_configurations);
    }

    private static readonly string DefaultWeights = SolverParamsValidator.Validate(SolverAlgorithm.Greedy, null, null).QuboWeightsJson;

    private static SolverConfiguration Config(string code, SolverAlgorithm algorithm = SolverAlgorithm.Greedy,
        bool active = false, int budget = 120, string? weights = null) => new()
    {
        Code = code,
        Name = code,
        Algorithm = algorithm,
        Family = SolverFamily.Classical,
        QuboWeights = weights ?? DefaultWeights,
        TimeBudgetMs = budget,
        IsActive = active
    };

    private void Existing(SolverConfiguration configuration, int sessions = 0, int results = 0)
    {
        _configurations.GetByIdAsync(configuration.Id, Arg.Any<CancellationToken>()).Returns(configuration);
        _configurations.GetUsageAsync(configuration.Id, Arg.Any<CancellationToken>())
            .Returns(new SolverConfigurationUsage(configuration, sessions, results));
    }

    private void Active(params SolverConfiguration[] active) =>
        _configurations.GetActiveAsync(Arg.Any<CancellationToken>()).Returns(active.ToList());

    [Theory]
    [InlineData("Greedy", "Classical")]
    [InlineData("ClassicalSa", "Classical")]
    [InlineData("Sqa", "QuantumInspired")]
    [InlineData("Qaoa", "QuantumInspired")]
    [InlineData("QpuDwave", "QuantumHardware")]
    public async Task Create_DerivesFamilyAndStartsInactive(string algorithm, string family)
    {
        var result = await _sut.CreateAsync(new CreateSolverConfigurationRequest
        {
            Code = "candidate", Name = "Candidate", Algorithm = algorithm, TimeBudgetMs = 120
        });

        result.Family.ShouldBe(family);
        result.IsActive.ShouldBeFalse();
        await _configurations.Received(1).AddAsync(Arg.Is<SolverConfiguration>(c => !c.IsActive), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Create_WithTakenCode_ThrowsConflict()
    {
        _configurations.CodeExistsAsync("sqa", Arg.Any<CancellationToken>()).Returns(true);

        await Should.ThrowAsync<ConflictException>(() => _sut.CreateAsync(new CreateSolverConfigurationRequest
        {
            Code = "sqa", Name = "SQA", Algorithm = "Sqa", TimeBudgetMs = 120
        }));
    }

    [Fact]
    public async Task Update_UsedConfigurationSettings_ThrowsConflict()
    {
        var used = Config("greedy");
        Existing(used, sessions: 3);

        await Should.ThrowAsync<ConflictException>(() => _sut.UpdateAsync(used.Id,
            new UpdateSolverConfigurationRequest { Name = "Greedy", TimeBudgetMs = 200 }));
        used.TimeBudgetMs.ShouldBe(120);
    }

    [Fact]
    public async Task Update_UsedConfigurationName_Succeeds()
    {
        var used = Config("greedy");
        Existing(used, results: 5);

        var result = await _sut.UpdateAsync(used.Id, new UpdateSolverConfigurationRequest
        {
            Name = "Greedy baseline",
            TimeBudgetMs = 120,
            // Same weights written differently: not a settings change
            QuboWeights = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>("""{"weight_coverage": 1.0}""")
        });

        result.Name.ShouldBe("Greedy baseline");
    }

    [Fact]
    public async Task Update_ActiveConfigurationBreakingFairness_ThrowsConflict()
    {
        var target = Config("greedy", active: true);
        Existing(target);
        Active(target, Config("sqa", SolverAlgorithm.Sqa, active: true));

        await Should.ThrowAsync<ConflictException>(() => _sut.UpdateAsync(target.Id,
            new UpdateSolverConfigurationRequest { Name = "Greedy", TimeBudgetMs = 250 }));
    }

    [Fact]
    public async Task SetActive_WithDifferentWeightsThanActiveOnes_ThrowsConflict()
    {
        var candidate = Config("ga", SolverAlgorithm.Genetic, weights: """{"weight_cover": 3}""");
        Existing(candidate);
        Active(Config("greedy", active: true));

        await Should.ThrowAsync<ConflictException>(() => _sut.SetActiveAsync(candidate.Id, true));
        candidate.IsActive.ShouldBeFalse();
    }

    [Fact]
    public async Task SetActive_WithMatchingSettings_Activates()
    {
        var candidate = Config("ga", SolverAlgorithm.Genetic);
        Existing(candidate);
        Active(Config("greedy", active: true));

        var result = await _sut.SetActiveAsync(candidate.Id, true);

        result.IsActive.ShouldBeTrue();
        result.IsAbArm.ShouldBeTrue();
    }

    [Fact]
    public async Task Deactivate_SkipsFairnessCheck()
    {
        var target = Config("greedy", active: true, budget: 999);
        Existing(target);

        await _sut.SetActiveAsync(target.Id, false);

        target.IsActive.ShouldBeFalse();
        await _configurations.DidNotReceive().GetActiveAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Delete_UsedConfiguration_ThrowsConflict()
    {
        var used = Config("greedy");
        Existing(used, sessions: 1);

        await Should.ThrowAsync<ConflictException>(() => _sut.DeleteAsync(used.Id));
        _configurations.DidNotReceive().Remove(Arg.Any<SolverConfiguration>());
    }

    [Fact]
    public async Task Clone_CopiesSettingsAsInactive()
    {
        var source = Config("sqa", SolverAlgorithm.Sqa, active: true);
        source.Params = """{"trotter": 16}""";
        Existing(source);

        var clone = await _sut.CloneAsync(source.Id, new CloneSolverConfigurationRequest { Code = "sqa_v2", Name = "SQA v2" });

        clone.Code.ShouldBe("sqa_v2");
        clone.Algorithm.ShouldBe("Sqa");
        clone.IsActive.ShouldBeFalse();
        clone.Params.GetProperty("trotter").GetInt32().ShouldBe(16);
    }
}
