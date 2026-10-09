using Npgsql;

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

    // EF wraps the Npgsql error in DbUpdateException; raw SQL throws it directly
    public static AppException? Map(Exception exception)
    {
        var postgres = exception as PostgresException ?? exception.InnerException as PostgresException;
        if (postgres is null)
            return null;

        return postgres.SqlState switch
        {
            PostgresErrorCodes.UniqueViolation => new ConflictException("The record already exists."),
            PostgresErrorCodes.ForeignKeyViolation => new ConflictException("The record references, or is referenced by, another record."),
            PostgresErrorCodes.CheckViolation or PostgresErrorCodes.NotNullViolation =>
                new ValidationException("request", "The data breaks a database rule."),
            // Class 22: data exceptions (value out of range, invalid JSON text, bad datetime...)
            _ when postgres.SqlState.StartsWith("22", StringComparison.Ordinal) =>
                new ValidationException("request", "The data has an invalid value."),
            _ => null
        };
    }
}
