using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ShadowVale.BLL.Exceptions;

namespace ShadowVale.API.Middlewares;

// Turns every exception escaping a controller into an RFC 7807 ProblemDetails response,
// so controllers never need try/catch: services throw, this maps.
public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    private const int ClientClosedRequest = 499;

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        // Client disconnected mid-request: nobody is listening, so don't log it as a server error
        if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
        {
            httpContext.Response.StatusCode = ClientClosedRequest;
            return true;
        }

        var originalException = exception;
        exception = DatabaseErrors.Map(exception) ?? exception;
        var (status, title) = exception switch
        {
            ValidationException => (StatusCodes.Status400BadRequest, "Validation failed"),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            ForbiddenException => (StatusCodes.Status403Forbidden, "Forbidden"),
            NotFoundException => (StatusCodes.Status404NotFound, "Not found"),
            ConflictException => (StatusCodes.Status409Conflict, "Conflict"),
            // Malformed request or body over the size limit (413): the client must not resend it as is
            BadHttpRequestException badRequest => (badRequest.StatusCode,
                badRequest.StatusCode == StatusCodes.Status413PayloadTooLarge ? "Payload too large" : "Bad request"),
            _ => (StatusCodes.Status500InternalServerError, "Internal server error")
        };

        if (status == StatusCodes.Status500InternalServerError)
            logger.LogError(originalException, "Unhandled exception on {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
        else
            logger.LogInformation("{ExceptionType} on {Method} {Path}: {Message}",
                exception.GetType().Name, httpContext.Request.Method, httpContext.Request.Path, exception.Message);

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = exception is AppException ? exception.Message : null,
            Instance = httpContext.Request.Path
        };

        if (exception is ValidationException validation)
            problem.Extensions["errors"] = validation.Errors;

        if (exception is UnauthorizedException unauthorized) problem.Extensions["code"] = unauthorized.Code;
        if (exception is ForbiddenException forbidden) problem.Extensions["code"] = forbidden.Code;

        await ApiProblems.WriteAsync(httpContext, problem, cancellationToken);
        return true;
    }
}
