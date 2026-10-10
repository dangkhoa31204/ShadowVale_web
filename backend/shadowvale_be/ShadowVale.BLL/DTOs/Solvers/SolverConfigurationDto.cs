using System.Text.Json;

namespace ShadowVale.BLL.DTOs.Solvers;

public sealed record SolverConfigurationDto(
    Guid Id,
    string Code,
    string Name,
    string Algorithm,
    string Family,
    // Solver id in the Python registry (/variants, /solve)
    string Variant,
    string? Library,
    JsonElement Params,
    JsonElement QuboWeights,
    int TimeBudgetMs,
    bool IsActive,
    // Active and runnable: new human sessions are split evenly between these
    bool IsAbArm,
    int SessionCount,
    int ResultCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);
