using ShadowVale.Contracts.Game;
using ShadowVale.Contracts.Telemetry;

namespace ShadowVale.BLL.Interfaces;

public interface IGameSessionService
{
    Task<StartSessionResponse> StartAsync(StartSessionRequest request, CancellationToken ct = default);
    Task<SessionUploadResponse> UploadAsync(Guid sessionId, SessionUpload upload, CancellationToken ct = default);
}
