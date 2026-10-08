namespace ShadowVale.BLL.Exceptions;

public class NotFoundException : AppException
{
    public NotFoundException(string message) : base(message) { }

    public NotFoundException(string entityName, object key)
        : base($"{entityName} '{key}' was not found.") { }
}
