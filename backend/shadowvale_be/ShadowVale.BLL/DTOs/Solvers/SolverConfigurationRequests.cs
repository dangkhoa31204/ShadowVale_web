using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace ShadowVale.BLL.DTOs.Solvers;

public sealed record SolverConfigurationQuery
{
    public string? Family { get; init; }
    public string? Algorithm { get; init; }
    public bool? IsActive { get; init; }
}

public sealed record CreateSolverConfigurationRequest
{
    // Also what the replay harness sends as requestedVariant, so it follows the solver's variant naming
    [Required, MaxLength(64), RegularExpression("^[a-z][a-z0-9_]*$",
        ErrorMessage = "Code must start with a letter and contain only lowercase letters, digits and '_'.")]
    public string Code { get; init; } = "";

    [Required, MaxLength(100)] public string Name { get; init; } = "";
    [Required] public string Algorithm { get; init; } = "";
    [MaxLength(50)] public string? Library { get; init; }
    public Dictionary<string, JsonElement>? Params { get; init; }
    public Dictionary<string, JsonElement>? QuboWeights { get; init; }
    [Range(1, 10_000)] public int TimeBudgetMs { get; init; }
}

// Code and algorithm are fixed once created. A configuration that was already used only accepts a new name.
public sealed record UpdateSolverConfigurationRequest
{
    [Required, MaxLength(100)] public string Name { get; init; } = "";
    [MaxLength(50)] public string? Library { get; init; }
    public Dictionary<string, JsonElement>? Params { get; init; }
    public Dictionary<string, JsonElement>? QuboWeights { get; init; }
    [Range(1, 10_000)] public int TimeBudgetMs { get; init; }
}

public sealed record CloneSolverConfigurationRequest
{
    [Required, MaxLength(64), RegularExpression("^[a-z][a-z0-9_]*$",
        ErrorMessage = "Code must start with a letter and contain only lowercase letters, digits and '_'.")]
    public string Code { get; init; } = "";

    [Required, MaxLength(100)] public string Name { get; init; } = "";
}

public sealed record SetSolverConfigurationActiveRequest
{
    public bool IsActive { get; init; }
}
