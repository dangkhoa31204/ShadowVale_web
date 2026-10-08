using ShadowVale.BLL.Exceptions;
using Shouldly;

namespace ShadowVale.BLL.Tests.Exceptions;

public class ExceptionTests
{
    [Fact]
    public void ValidationException_WithSingleField_ExposesItInErrors()
    {
        var ex = new ValidationException("name", "Name is required.");

        ex.Errors.Keys.ShouldBe(["name"]);
        ex.Errors["name"].ShouldBe(["Name is required."]);
    }

    [Fact]
    public void NotFoundException_WithEntityAndKey_BuildsReadableMessage()
    {
        var id = Guid.Parse("0199c3a0-0000-7000-8000-000000000001");

        var ex = new NotFoundException("ContentBundle", id);

        ex.Message.ShouldBe($"ContentBundle '{id}' was not found.");
    }

    [Fact]
    public void BusinessExceptions_DeriveFromAppException()
    {
        // GlobalExceptionHandler relies on this to decide which messages are safe to show to clients
        Exception[] exceptions =
        [
            new ValidationException("f", "e"),
            new NotFoundException("x"),
            new ConflictException("x"),
            new UnauthorizedException(),
            new ForbiddenException()
        ];

        exceptions.ShouldAllBe(e => e is AppException);
    }
}
