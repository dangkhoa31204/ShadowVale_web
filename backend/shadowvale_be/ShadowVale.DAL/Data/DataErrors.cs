using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ShadowVale.DAL.Data;

public enum DataErrorKind
{
    ConcurrencyConflict,
    UniqueViolation,
    ForeignKeyViolation,
    RuleViolation,
    InvalidValue
}

// Names the database errors a request itself can cause, so the BLL can react without knowing EF Core or PostgreSQL
public static class DataErrors
{
    // EF wraps the Npgsql error in DbUpdateException; raw SQL throws it directly
    public static DataErrorKind? Classify(Exception exception)
    {
        // Optimistic concurrency token (content version revision) changed since the row was read
        if (exception is DbUpdateConcurrencyException)
            return DataErrorKind.ConcurrencyConflict;

        var postgres = exception as PostgresException ?? exception.InnerException as PostgresException;
        if (postgres is null)
            return null;

        return postgres.SqlState switch
        {
            PostgresErrorCodes.UniqueViolation => DataErrorKind.UniqueViolation,
            PostgresErrorCodes.ForeignKeyViolation => DataErrorKind.ForeignKeyViolation,
            PostgresErrorCodes.CheckViolation or PostgresErrorCodes.NotNullViolation => DataErrorKind.RuleViolation,
            // Class 22: data exceptions (value out of range, invalid JSON text, bad datetime...)
            _ when postgres.SqlState.StartsWith("22", StringComparison.Ordinal) => DataErrorKind.InvalidValue,
            _ => null
        };
    }
}
