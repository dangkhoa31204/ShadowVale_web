namespace ShadowVale.BLL.DTOs.Meta;

// Values accepted by the solver configuration, game and analytics endpoints
public sealed record EnumsDto(
    IReadOnlyList<string> SolverAlgorithms,
    IReadOnlyList<string> SolverFamilies,
    IReadOnlyList<string> SessionOutcomes,
    IReadOnlyList<string> EncounterOutcomes,
    IReadOnlyList<string> SessionSources);
