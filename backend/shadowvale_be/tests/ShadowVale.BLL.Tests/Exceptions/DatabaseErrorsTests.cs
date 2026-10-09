using Microsoft.EntityFrameworkCore;
using Npgsql;
using ShadowVale.BLL.Exceptions;
using Shouldly;

namespace ShadowVale.BLL.Tests.Exceptions;

public class DatabaseErrorsTests
{
    private static PostgresException Postgres(string sqlState) => new("boom", "ERROR", "ERROR", sqlState);

    [Theory]
    [InlineData(PostgresErrorCodes.UniqueViolation, typeof(ConflictException))]
    [InlineData(PostgresErrorCodes.ForeignKeyViolation, typeof(ConflictException))]
    [InlineData(PostgresErrorCodes.CheckViolation, typeof(ValidationException))]
    [InlineData(PostgresErrorCodes.NumericValueOutOfRange, typeof(ValidationException))]
    [InlineData(PostgresErrorCodes.InvalidTextRepresentation, typeof(ValidationException))]
    public void Map_RequestCausedErrors_BecomeBusinessErrors(string sqlState, Type expected)
    {
        DatabaseErrors.Map(Postgres(sqlState)).ShouldBeOfType(expected);
        // EF wraps the Npgsql error when SaveChanges fails
        DatabaseErrors.Map(new DbUpdateException("save failed", Postgres(sqlState))).ShouldBeOfType(expected);
    }

    [Theory]
    [InlineData(PostgresErrorCodes.DeadlockDetected)]
    [InlineData(PostgresErrorCodes.TooManyConnections)]
    public void Map_TransientErrors_StayServerErrors(string sqlState)
    {
        // Left as 5xx so the game retries later
        DatabaseErrors.Map(Postgres(sqlState)).ShouldBeNull();
        DatabaseErrors.Map(new TimeoutException()).ShouldBeNull();
    }

    [Fact]
    public async Task GuardAsync_RethrowsMappedError()
    {
        await Should.ThrowAsync<ConflictException>(() =>
            DatabaseErrors.GuardAsync(() => Task.FromException(Postgres(PostgresErrorCodes.UniqueViolation))));
    }
}
