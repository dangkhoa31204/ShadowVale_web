namespace ShadowVale.BLL.DTOs.Meta;

// Values accepted by the solver configuration, content, game and analytics endpoints
public sealed record EnumsDto(
    IReadOnlyList<string> SolverAlgorithms,
    IReadOnlyList<string> SolverFamilies,
    IReadOnlyList<string> SessionOutcomes,
    IReadOnlyList<string> EncounterOutcomes,
    IReadOnlyList<string> SessionSources,
    IReadOnlyList<string> ItemTypes,
    IReadOnlyList<string> ItemRarities,
    IReadOnlyList<string> WeaponClasses,
    IReadOnlyList<string> SkillTypes,
    IReadOnlyList<string> ContentStatuses);
