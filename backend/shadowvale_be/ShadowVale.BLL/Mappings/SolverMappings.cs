using System.Text.Json;
using ShadowVale.BLL.DTOs.Solvers;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Mappings;

public static class SolverMappings
{
    // Algorithm -> solver id in shadowvale-solver/svl_solver/solvers/registry.py
    public static string Variant(this SolverAlgorithm algorithm) => algorithm switch
    {
        SolverAlgorithm.Greedy => "greedy",
        SolverAlgorithm.Genetic => "ga",
        SolverAlgorithm.ClassicalSa => "sa",
        SolverAlgorithm.Sqa => "sqa",
        SolverAlgorithm.Qiea => "qiea",
        SolverAlgorithm.Qaoa => "qaoa",
        SolverAlgorithm.QpuDwave => "qpu",
        _ => throw new ArgumentOutOfRangeException(nameof(algorithm), algorithm, null)
    };

    // Derived, never chosen by the user, so the classical vs quantum-inspired comparison cannot be mislabelled
    // (the database has the same rule as a check constraint)
    public static SolverFamily Family(this SolverAlgorithm algorithm) => algorithm switch
    {
        SolverAlgorithm.Greedy or SolverAlgorithm.Genetic or SolverAlgorithm.ClassicalSa => SolverFamily.Classical,
        SolverAlgorithm.QpuDwave => SolverFamily.QuantumHardware,
        _ => SolverFamily.QuantumInspired
    };

    // A/B arms: active and runnable. The D-Wave QPU variant is not implemented in the solver yet,
    // so every plan would be a fallback and its numbers would be meaningless.
    public static bool IsAbArm(this SolverConfiguration configuration) =>
        configuration.IsActive && configuration.Algorithm != SolverAlgorithm.QpuDwave;

    public static SolverConfigurationDto ToDto(this SolverConfigurationUsage usage)
    {
        var c = usage.Configuration;
        return new SolverConfigurationDto(
            c.Id,
            c.Code,
            c.Name,
            c.Algorithm.ToString(),
            c.Family.ToString(),
            c.Algorithm.Variant(),
            c.Library,
            ParseJson(c.Params),
            ParseJson(c.QuboWeights),
            c.TimeBudgetMs,
            c.IsActive,
            c.IsAbArm(),
            usage.SessionCount,
            usage.ResultCount,
            c.CreatedAt,
            c.UpdatedAt);
    }

    public static JsonElement ParseJson(string json)
    {
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }
}
