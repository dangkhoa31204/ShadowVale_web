using ShadowVale.DAL.Data;

namespace ShadowVale.BLL.Exceptions;

// Turns database errors caused by the request itself into 4xx business errors. A retried request would fail the
// same way, so it must never surface as 5xx: the game treats 5xx as "send again" and would retry forever.
public static class DatabaseErrors
{
    public static async Task<T> GuardAsync<T>(Func<Task<T>> write)
    {
        try
        {
            return await write();
        }
        catch (Exception ex) when (Map(ex) is { } mapped)
        {
            throw mapped;
        }
    }

    public static async Task GuardAsync(Func<Task> write)
    {
        try
        {
            await write();
        }
        catch (Exception ex) when (Map(ex) is { } mapped)
        {
            throw mapped;
        }
    }

    // The DAL recognises the database error (DataErrors); this only decides what it means for the caller
    public static AppException? Map(Exception exception) =>
        DataErrors.Classify(exception) switch
        {
            DataErrorKind.ConcurrencyConflict =>
                new ConflictException("Someone else changed this record at the same time. Reload it and try again."),
            DataErrorKind.UniqueViolation => new ConflictException("The record already exists."),
            DataErrorKind.ForeignKeyViolation => new ConflictException("The record references, or is referenced by, another record."),
            DataErrorKind.RuleViolation => new ValidationException("request", "The data breaks a database rule."),
            DataErrorKind.InvalidValue => new ValidationException("request", "The data has an invalid value."),
            _ => null
        };
}
