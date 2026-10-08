namespace ShadowVale.BLL.Exceptions;

// Business-rule validation (e.g. a content bundle failing its JSON Schema).
// Same "errors" shape as ASP.NET's automatic model validation, so the frontend handles both alike.
public class ValidationException : AppException
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ValidationException(IReadOnlyDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }

    public ValidationException(string field, string error)
        : this(new Dictionary<string, string[]> { [field] = [error] }) { }
}
