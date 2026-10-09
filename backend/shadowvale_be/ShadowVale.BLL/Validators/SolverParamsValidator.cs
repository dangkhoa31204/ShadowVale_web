using System.Text.Json;
using ShadowVale.BLL.Exceptions;
using ShadowVale.DAL.Entities;

namespace ShadowVale.BLL.Validators;

// Checks solver hyper-parameters and QUBO weights against what the Python solver actually accepts
// (constructors in shadowvale-solver/svl_solver/solvers/*.py, request fields in svl_solver/api/schemas.py),
// so a configuration can never send the solver a parameter it would reject or silently ignore.
public static class SolverParamsValidator
{
    private enum Kind { Integer, Number, Text }

    private sealed record Spec(Kind Kind, double Min = double.MinValue, double Max = double.MaxValue, string[]? Allowed = null);

    // Share of the latency budget the solver may use before returning its best answer
    private static readonly Spec TimeFraction = new(Kind.Number, 0.01, 1);

    private static readonly Dictionary<SolverAlgorithm, Dictionary<string, Spec>> ParamSpecs = new()
    {
        [SolverAlgorithm.Greedy] = [],
        [SolverAlgorithm.QpuDwave] = [],
        [SolverAlgorithm.Genetic] = new()
        {
            ["population"] = new(Kind.Integer, 4, 10_000),
            ["generations"] = new(Kind.Integer, 1, 100_000),
            ["mutation"] = new(Kind.Number, 0, 1),
            ["elite"] = new(Kind.Integer, 1, 10_000),
            ["tournament"] = new(Kind.Integer, 2, 1_000),
            ["time_fraction"] = TimeFraction
        },
        [SolverAlgorithm.ClassicalSa] = new()
        {
            ["num_sweeps"] = new(Kind.Integer, 1, 1_000_000),
            ["num_reads"] = new(Kind.Integer, 1, 10_000),
            ["batch"] = new(Kind.Integer, 1, 10_000),
            ["beta_hot"] = new(Kind.Number, 1e-6, 1e6),
            ["beta_cold"] = new(Kind.Number, 1e-6, 1e6),
            ["time_fraction"] = TimeFraction
        },
        [SolverAlgorithm.Sqa] = new()
        {
            ["trotter"] = new(Kind.Integer, 2, 1_024),
            ["sweeps"] = new(Kind.Integer, 1, 1_000_000),
            ["temperature"] = new(Kind.Number, 1e-6, 1e3),
            ["gamma_start"] = new(Kind.Number, 0, 1e3),
            ["gamma_end"] = new(Kind.Number, 0, 1e3),
            ["time_fraction"] = TimeFraction,
            ["normalise"] = new(Kind.Text, Allowed: ["lambda", "max"])
        },
        [SolverAlgorithm.Qiea] = new()
        {
            ["population"] = new(Kind.Integer, 2, 10_000),
            ["generations"] = new(Kind.Integer, 1, 1_000_000),
            ["delta"] = new(Kind.Number, 1e-6, Math.PI / 2),
            // Rotation angles are kept inside [margin, pi/2 - margin]
            ["margin"] = new(Kind.Number, 0, Math.PI / 4 - 1e-6),
            ["time_fraction"] = TimeFraction
        },
        [SolverAlgorithm.Qaoa] = new()
        {
            ["layers"] = new(Kind.Integer, 1, 20),
            ["shots"] = new(Kind.Integer, 1, 1_000_000),
            ["grid"] = new(Kind.Integer, 2, 1_000),
            ["max_qubits"] = new(Kind.Integer, 1, 30),
            ["refine_iterations"] = new(Kind.Integer, 0, 100_000),
            ["time_fraction"] = TimeFraction
        }
    };

    // QUBO objective / penalty weights with the solver's defaults; a configuration always stores all of them,
    // so two configurations can be compared for a fair A/B test
    public static readonly IReadOnlyDictionary<string, double> DefaultQuboWeights = new SortedDictionary<string, double>(StringComparer.Ordinal)
    {
        ["weight_coverage"] = 1.0,
        ["weight_redundancy"] = 0.5,
        ["weight_flanking"] = 1.0,
        ["weight_cover"] = 0.5,
        ["weight_distance"] = 0.1,
        ["penalty_conflict"] = 0.0
    };

    private const double MaxWeight = 1_000;

    public static IReadOnlyCollection<string> AllowedParams(SolverAlgorithm algorithm) => ParamSpecs[algorithm].Keys;

    // Returns the canonical JSON to store; throws ValidationException listing every problem
    public static (string ParamsJson, string QuboWeightsJson) Validate(
        SolverAlgorithm algorithm,
        IReadOnlyDictionary<string, JsonElement>? parameters,
        IReadOnlyDictionary<string, JsonElement>? quboWeights)
    {
        var errors = new Dictionary<string, string[]>();
        var specs = ParamSpecs[algorithm];
        var cleanParams = new SortedDictionary<string, object>(StringComparer.Ordinal);

        foreach (var (key, value) in parameters ?? new Dictionary<string, JsonElement>())
        {
            var field = $"Params.{key}";
            if (!specs.TryGetValue(key, out var spec))
            {
                errors[field] = [specs.Count == 0
                    ? $"{algorithm} takes no parameters."
                    : $"Unknown parameter for {algorithm}. Allowed: {string.Join(", ", specs.Keys)}."];
                continue;
            }

            var (clean, error) = Check(value, spec);
            if (error is not null)
                errors[field] = [error];
            else
                cleanParams[key] = clean!;
        }

        var cleanWeights = new SortedDictionary<string, double>(DefaultQuboWeights.ToDictionary(), StringComparer.Ordinal);
        foreach (var (key, value) in quboWeights ?? new Dictionary<string, JsonElement>())
        {
            var field = $"QuboWeights.{key}";
            if (!DefaultQuboWeights.ContainsKey(key))
            {
                errors[field] = [$"Unknown QUBO weight. Allowed: {string.Join(", ", DefaultQuboWeights.Keys)}."];
                continue;
            }

            var (clean, error) = Check(value, new Spec(Kind.Number, 0, MaxWeight));
            if (error is not null)
                errors[field] = [error];
            else
                cleanWeights[key] = (double)clean!;
        }

        if (errors.Count > 0)
            throw new ValidationException(errors);

        return (JsonSerializer.Serialize(cleanParams), JsonSerializer.Serialize(cleanWeights));
    }

    // Weights as stored (jsonb text, any key order) -> comparable dictionary
    public static SortedDictionary<string, double> ParseWeights(string json)
    {
        var weights = new SortedDictionary<string, double>(DefaultQuboWeights.ToDictionary(), StringComparer.Ordinal);
        using var document = JsonDocument.Parse(json);
        foreach (var property in document.RootElement.EnumerateObject())
        {
            if (property.Value.ValueKind == JsonValueKind.Number)
                weights[property.Name] = property.Value.GetDouble();
        }
        return weights;
    }

    public static bool SameWeights(string a, string b) => ParseWeights(a).SequenceEqual(ParseWeights(b));

    private static (object? Value, string? Error) Check(JsonElement value, Spec spec)
    {
        switch (spec.Kind)
        {
            case Kind.Text:
                if (value.ValueKind != JsonValueKind.String || !spec.Allowed!.Contains(value.GetString()))
                    return (null, $"Must be one of: {string.Join(", ", spec.Allowed!)}.");
                return (value.GetString(), null);

            case Kind.Integer:
                if (value.ValueKind != JsonValueKind.Number || !value.TryGetInt64(out var integer))
                    return (null, "Must be a whole number.");
                if (integer < spec.Min || integer > spec.Max)
                    return (null, $"Must be between {spec.Min} and {spec.Max}.");
                return (integer, null);

            default:
                if (value.ValueKind != JsonValueKind.Number || !value.TryGetDouble(out var number) || !double.IsFinite(number))
                    return (null, "Must be a number.");
                if (number < spec.Min || number > spec.Max)
                    return (null, $"Must be between {spec.Min:G4} and {spec.Max:G4}.");
                return (number, null);
        }
    }
}
