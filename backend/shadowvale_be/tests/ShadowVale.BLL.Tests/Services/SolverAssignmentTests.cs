using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Entities;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class SolverAssignmentTests
{
    private static SolverConfiguration Config(string code, SolverAlgorithm algorithm, bool active = true) =>
        new() { Code = code, Name = code, Algorithm = algorithm, IsActive = active };

    private static readonly SolverConfiguration Greedy = Config("greedy", SolverAlgorithm.Greedy);
    private static readonly SolverConfiguration Sqa = Config("sqa", SolverAlgorithm.Sqa);
    private static readonly SolverConfiguration Qpu = Config("qpu", SolverAlgorithm.QpuDwave);
    private static readonly SolverConfiguration InactiveGa = Config("ga", SolverAlgorithm.Genetic, active: false);

    [Fact]
    public void ForHuman_SameSession_AlwaysGetsSameArm()
    {
        var sessionId = Guid.NewGuid();

        var first = SolverAssignment.ForHuman(sessionId, [Greedy, Sqa]);
        // Order of the input must not matter either
        var again = SolverAssignment.ForHuman(sessionId, [Sqa, Greedy]);

        again.ShouldBeSameAs(first);
    }

    [Fact]
    public void ForHuman_SplitsSessionsEvenlyAcrossArms()
    {
        var counts = new Dictionary<string, int> { ["greedy"] = 0, ["sqa"] = 0 };
        var random = new Random(2026);

        for (var i = 0; i < 10_000; i++)
        {
            var bytes = new byte[16];
            random.NextBytes(bytes);
            counts[SolverAssignment.ForHuman(new Guid(bytes), [Greedy, Sqa])!.Code]++;
        }

        counts["greedy"].ShouldBeInRange(4_800, 5_200);
    }

    [Fact]
    public void ForHuman_SkipsInactiveAndQpuConfigurations()
    {
        for (var i = 0; i < 50; i++)
            SolverAssignment.ForHuman(Guid.NewGuid(), [InactiveGa, Qpu, Sqa]).ShouldBeSameAs(Sqa);
    }

    [Fact]
    public void ForHuman_WithoutArms_ReturnsNull()
    {
        SolverAssignment.ForHuman(Guid.NewGuid(), [InactiveGa, Qpu]).ShouldBeNull();
    }

    [Fact]
    public void ForReplay_ReturnsRequestedCodeEvenWhenInactive()
    {
        SolverAssignment.ForReplay("ga", [Greedy, InactiveGa]).ShouldBeSameAs(InactiveGa);
    }

    [Fact]
    public void ForReplay_WithUnknownCode_ThrowsValidation()
    {
        var ex = Should.Throw<ValidationException>(() => SolverAssignment.ForReplay("sqa_v9", [Greedy, Sqa]));

        ex.Errors.ShouldContainKey("RequestedVariant");
    }

    [Theory]
    [InlineData("sqa_tuned", "sqa_tuned")] // the session's code
    [InlineData("sqa", "sqa_tuned")]       // the session's solver variant
    [InlineData("greedy", "greedy")]       // another configuration's code (e.g. a fallback plan)
    public void ForResult_PrefersSessionConfiguration(string variant, string expectedCode)
    {
        var sessionConfiguration = Config("sqa_tuned", SolverAlgorithm.Sqa);
        var byCode = new Dictionary<string, SolverConfiguration> { ["greedy"] = Greedy, ["sqa_tuned"] = sessionConfiguration };

        SolverAssignment.ForResult(variant, sessionConfiguration, byCode)!.Code.ShouldBe(expectedCode);
    }

    [Fact]
    public void ForResult_WithUnknownVariant_ReturnsNull()
    {
        SolverAssignment.ForResult("qaoa", null, new Dictionary<string, SolverConfiguration> { ["greedy"] = Greedy }).ShouldBeNull();
    }
}
