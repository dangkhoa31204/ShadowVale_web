namespace ShadowVale.BLL.DTOs.Common;

public enum ServiceErrorKind { Validation, NotFound, Conflict }

public sealed record ServiceError(ServiceErrorKind Kind, string Code, string Message,
    IReadOnlyDictionary<string, string[]>? Errors = null);

public sealed record ServiceResult<T>(T? Data, ServiceError? Error = null)
{
    public static implicit operator ServiceResult<T>(T data) => new(data);
    public static implicit operator ServiceResult<T>(ServiceError error) => new(default, error);
}
