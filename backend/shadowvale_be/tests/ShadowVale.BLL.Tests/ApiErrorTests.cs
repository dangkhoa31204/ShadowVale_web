using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using ShadowVale.API.Middlewares;
using ShadowVale.BLL.Exceptions;

namespace ShadowVale.BLL.Tests;

public class ApiErrorTests
{
    [Theory]
    [InlineData(405, "METHOD_NOT_ALLOWED")]
    [InlineData(413, "PAYLOAD_TOO_LARGE")]
    [InlineData(415, "UNSUPPORTED_MEDIA_TYPE")]
    [InlineData(429, "RATE_LIMITED")]
    public async Task Framework_errors_are_json_even_with_html_accept(int status, string code)
    {
        var context = Context();
        await ApiProblems.WriteAsync(context, new ProblemDetails { Status = status });
        using var json = JsonDocument.Parse(((MemoryStream)context.Response.Body).ToArray());
        Assert.Equal(code, json.RootElement.GetProperty("code").GetString());
        Assert.Equal(status, context.Response.StatusCode);
        Assert.Equal("application/problem+json", context.Response.ContentType);
        Assert.Equal("test-trace", json.RootElement.GetProperty("traceId").GetString());
    }

    [Fact]
    public async Task Internal_exception_never_leaks_source_or_database_details()
    {
        var context = Context();
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        Assert.True(await handler.TryHandleAsync(context, new Exception("SECRET database details"), default));
        var body = System.Text.Encoding.UTF8.GetString(((MemoryStream)context.Response.Body).ToArray());
        Assert.DoesNotContain("SECRET", body);
        Assert.Contains("INTERNAL_ERROR", body);
        Assert.Equal(500, context.Response.StatusCode);
    }

    [Fact]
    public async Task Business_validation_preserves_field_error()
    {
        var context = Context();
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        await handler.TryHandleAsync(context, new ValidationException("revision", "Reload the current revision."), default);
        using var json = JsonDocument.Parse(((MemoryStream)context.Response.Body).ToArray());
        Assert.Equal("Reload the current revision.", json.RootElement.GetProperty("errors").GetProperty("revision")[0].GetString());
        Assert.Equal(400, context.Response.StatusCode);
    }

    private static DefaultHttpContext Context()
    {
        var context = new DefaultHttpContext { TraceIdentifier = "test-trace" };
        context.Request.Headers.Accept = "text/html";
        context.Response.Body = new MemoryStream();
        return context;
    }
}
