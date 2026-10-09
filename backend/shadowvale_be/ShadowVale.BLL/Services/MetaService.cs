using ShadowVale.BLL.DTOs.Meta;
using ShadowVale.BLL.Interfaces;
using ShadowVale.DAL.Entities;

namespace ShadowVale.BLL.Services;

// Allowed values for dropdowns and filters, read from the enums so the frontend never hard-codes them
public class MetaService : IMetaService
{
    public EnumsDto GetEnums() => new(
        Enum.GetNames<SolverAlgorithm>(),
        Enum.GetNames<SolverFamily>(),
        Enum.GetNames<SessionOutcome>(),
        Enum.GetNames<EncounterOutcome>(),
        Enum.GetNames<SessionSource>().Select(s => s.ToLowerInvariant()).ToArray());
}
