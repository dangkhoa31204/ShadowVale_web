using Microsoft.AspNetCore.Mvc;

namespace ShadowVale.API.Middlewares;

public static class ApiProblems
{
    public static void Customize(HttpContext context, ProblemDetails problem)
    {
        var (code, title, message) = problem.Status switch
        {
            400 => ("VALIDATION_FAILED", "Validation failed", "Please check the submitted fields."),
            401 => ("UNAUTHORIZED", "Unauthorized", "Authentication is required or the supplied credentials are invalid, expired or revoked."),
            403 => ("FORBIDDEN", "Forbidden", "You do not have permission to perform this action."),
            404 => ("NOT_FOUND", "Not found", "The requested resource was not found."),
            405 => ("METHOD_NOT_ALLOWED", "Method not allowed", "This HTTP method is not supported for this endpoint."),
            409 => ("CONFLICT", "Conflict", "The request conflicts with the current resource state."),
            413 => ("PAYLOAD_TOO_LARGE", "Payload too large", "The request body exceeds the allowed size."),
            415 => ("UNSUPPORTED_MEDIA_TYPE", "Unsupported media type", "Use a supported Content-Type, normally application/json."),
            429 => ("RATE_LIMITED", "Too many requests", "Too many requests. Please wait before trying again."),
            503 => ("SERVICE_UNAVAILABLE", "Service unavailable", "The service is temporarily unavailable. Please try again later."),
            _ => problem.Status >= 500
                ? ("INTERNAL_ERROR", "Internal server error", "An unexpected error occurred. Please try again later.")
                : ("HTTP_ERROR", "Request failed", "The request could not be completed.")
        };
        problem.Title ??= title;
        problem.Instance ??= context.Request.Path;
        problem.Extensions.TryAdd("code", code);
        if (problem.Status >= 500) problem.Detail = message;
        else problem.Detail ??= message;
        problem.Extensions["message"] = problem.Detail;
        problem.Extensions["traceId"] = context.TraceIdentifier;
    }

    // Error responses must remain JSON even when Accept requests HTML or CSV.
    public static Task WriteAsync(HttpContext context, ProblemDetails problem, CancellationToken ct = default)
    {
        Customize(context, problem);
        context.Response.StatusCode = problem.Status ?? 500;
        return context.Response.WriteAsJsonAsync(problem, options: null,
            contentType: "application/problem+json", cancellationToken: ct);
    }
}
