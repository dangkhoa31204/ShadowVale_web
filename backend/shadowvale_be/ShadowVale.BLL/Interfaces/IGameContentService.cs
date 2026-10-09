using ShadowVale.BLL.DTOs.Game;
using ShadowVale.Contracts.Game;

namespace ShadowVale.BLL.Interfaces;

public interface IGameContentService
{
    Task<ContentManifest> GetManifestAsync(CancellationToken ct = default);
    Task<GameBundle> GetPublishedBundleAsync(CancellationToken ct = default);
    Task<GameBundle> GetVersionBundleAsync(Guid versionId, CancellationToken ct = default);
}
