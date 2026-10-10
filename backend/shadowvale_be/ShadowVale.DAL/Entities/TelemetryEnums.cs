namespace ShadowVale.DAL.Entities;

// Stored as text, see ContentEnums.cs

public enum SessionOutcome
{
    InProgress,
    Completed,
    Died,
    Quit,
    Crashed
}

// Main comparison axis of the research: classical baselines vs quantum-inspired solvers
public enum SolverFamily
{
    Classical,
    QuantumInspired,
    QuantumHardware
}

public enum SolverAlgorithm
{
    Greedy,
    Genetic,
    ClassicalSa,
    // QAOA simulated with numpy, not on quantum hardware
    Qaoa,
    // Simulated quantum annealing (own path-integral Monte Carlo implementation)
    Sqa,
    Qiea,
    QpuDwave
}

// Squad tactic encoded as a QUBO problem
public enum CoordinationTask
{
    RouteCoverage,
    CoverAssignment,
    Flanking
}

// Who played the session: a real player, or the replay harness (bot) used for the solver benchmark.
// The two are never mixed in analytics. Stored lowercase ("human" / "replay").
public enum SessionSource
{
    Human,
    Replay
}

// Result of one encounter (squad engages the player), reported by the game in the session stats
public enum EncounterOutcome
{
    PlayerCaptured,
    PlayerEscaped,
    SquadEliminated,
    Aborted
}
