namespace ShadowVale.DAL.Entities;

// A solver (algorithm) with one set of hyper-parameters, e.g. "QAOA p=2, 1024 shots"
public class SolverConfiguration : BaseEntity
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public SolverAlgorithm Algorithm { get; set; }
    public SolverFamily Family { get; set; }

    // qiskit-aer / dwave-neal / custom...
    public string? Library { get; set; }

    // Hyper-parameters and QUBO objective/penalty weights (jsonb)
    public string Params { get; set; } = "{}";
    public string QuboWeights { get; set; } = "{}";

    // Real-time latency budget for one re-plan
    public int TimeBudgetMs { get; set; }
    public bool IsActive { get; set; } = true;
}
