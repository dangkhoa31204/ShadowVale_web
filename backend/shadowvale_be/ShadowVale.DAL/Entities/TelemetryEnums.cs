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
    QaoaAer,
    SqaNeal,
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

public enum EncounterOutcome
{
    PlayerCaptured,
    PlayerEscaped,
    SquadEliminated,
    Aborted
}
