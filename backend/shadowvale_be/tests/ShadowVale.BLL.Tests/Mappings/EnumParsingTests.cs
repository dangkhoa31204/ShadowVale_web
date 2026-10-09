using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Mappings;
using ShadowVale.DAL.Entities;
using Shouldly;

namespace ShadowVale.BLL.Tests.Mappings;

public class EnumParsingTests
{
    [Theory]
    [InlineData("Sqa", SolverAlgorithm.Sqa)]
    [InlineData(" qaoa ", SolverAlgorithm.Qaoa)]
    [InlineData("CLASSICALSA", SolverAlgorithm.ClassicalSa)]
    public void Parse_WithMemberName_IgnoresCaseAndSpaces(string value, SolverAlgorithm expected)
    {
        EnumParsing.Parse<SolverAlgorithm>(value, "Algorithm").ShouldBe(expected);
    }

    [Theory]
    [InlineData("1")]
    [InlineData("Greedy, Sqa")]
    [InlineData("")]
    [InlineData(null)]
    public void Parse_WithNumberListOrEmpty_ThrowsValidationForField(string? value)
    {
        var ex = Should.Throw<ValidationException>(() => EnumParsing.Parse<SolverAlgorithm>(value, "Algorithm"));

        ex.Errors.ShouldContainKey("Algorithm");
    }

    [Fact]
    public void ParseOptional_WithBlank_ReturnsNull()
    {
        EnumParsing.ParseOptional<SessionSource>(" ", "Source").ShouldBeNull();
        EnumParsing.ParseOptional<SessionSource>("replay", "Source").ShouldBe(SessionSource.Replay);
    }
}
