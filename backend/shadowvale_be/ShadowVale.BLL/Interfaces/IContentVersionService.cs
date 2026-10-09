using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.DTOs.Content;

namespace ShadowVale.BLL.Interfaces;

public interface IContentVersionService
{
    Task<ServiceResult<bool>> DeleteAsync(Guid id, DeleteContentVersionRequest request, CancellationToken ct = default);
    Task<ServiceResult<PagedResult<ContentVersionDto>>> SearchAsync(ContentVersionQuery query, CancellationToken ct = default);
    Task<ServiceResult<ContentVersionDetailsDto>> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ServiceResult<ContentComparisonDto>> CompareAsync(Guid id, Guid targetId, CancellationToken ct = default);
    Task<ServiceResult<ContentVersionDto>> CreateAsync(CreateContentVersionRequest request, Guid actorId, CancellationToken ct = default);
    Task<ServiceResult<ContentVersionDto>> UpdateAsync(Guid id, UpdateContentVersionRequest request, CancellationToken ct = default);
    Task<ServiceResult<ContentValidationResultDto>> ValidateAsync(Guid id, ValidateContentVersionRequest request, CancellationToken ct = default);
}
