using System.Text.Json;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Validators;
using ShadowVale.DAL.Entities;
using Shouldly;

namespace ShadowVale.BLL.Tests.Validators;

public class SolverParamsValidatorTests
{
    private static Dictionary<string, JsonElement> Json(string json) =>
        JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json)!;

    [Fact]
    public void Validate_WithKnownParams_ReturnsCanonicalJsonAndAllWeights()
    {
        var (parameters, weights) = SolverParamsValidator.Validate(
            SolverAlgorithm.Sqa, Json("""{"trotter": 16, "normalise": "max", "temperature": 0.01}"""), Json("""{"weight_cover": 2}"""));

        parameters.ShouldBe("""{"normalise":"max","temperature":0.01,"trotter":16}""");
        var parsed = SolverParamsValidator.ParseWeights(weights);
        parsed.Count.ShouldBe(6);
        parsed["weight_cover"].ShouldBe(2);
        parsed["weight_coverage"].ShouldBe(1.0);
    }

    [Theory]
    [InlineData(SolverAlgorithm.Sqa, """{"layers": 2}""", "Params.layers")]
    [InlineData(SolverAlgorithm.Greedy, """{"population": 10}""", "Params.population")]
    [InlineData(SolverAlgorithm.Genetic, """{"population": 10.5}""", "Params.population")]
    [InlineData(SolverAlgorithm.Genetic, """{"population": "10"}""", "Params.population")]
    [InlineData(SolverAlgorithm.Genetic, """{"mutation": 1.5}""", "Params.mutation")]
    [InlineData(SolverAlgorithm.Qaoa, """{"time_fraction": 0}""", "Params.time_fraction")]
    [InlineData(SolverAlgorithm.Sqa, """{"normalise": "none"}""", "Params.normalise")]
    public void Validate_WithWrongParam_ReportsThatField(SolverAlgorithm algorithm, string json, string field)
    {
        var ex = Should.Throw<ValidationException>(() => SolverParamsValidator.Validate(algorithm, Json(json), null));

        ex.Errors.Keys.ShouldBe([field]);
    }

    [Theory]
    [InlineData("""{"weight_unknown": 1}""", "QuboWeights.weight_unknown")]
    [InlineData("""{"penalty_conflict": -1}""", "QuboWeights.penalty_conflict")]
    [InlineData("""{"weight_cover": true}""", "QuboWeights.weight_cover")]
    public void Validate_WithWrongWeight_ReportsThatField(string json, string field)
    {
        var ex = Should.Throw<ValidationException>(() => SolverParamsValidator.Validate(SolverAlgorithm.Greedy, null, Json(json)));

        ex.Errors.Keys.ShouldBe([field]);
    }

    [Fact]
    public void SameWeights_IgnoresKeyOrderAndMissingDefaults()
    {
        SolverParamsValidator.SameWeights(
            """{"weight_cover": 0.5, "weight_coverage": 1.0}""",
            """{"weight_coverage": 1, "weight_redundancy": 0.5}""").ShouldBeTrue();
        SolverParamsValidator.SameWeights("""{"weight_cover": 0.6}""", "{}").ShouldBeFalse();
    }
}
