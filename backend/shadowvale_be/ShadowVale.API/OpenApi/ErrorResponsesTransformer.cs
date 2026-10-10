using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace ShadowVale.API.OpenApi;

public sealed class ErrorResponsesTransformer : IOpenApiOperationTransformer
{
    public async Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken ct)
    {
        var schema = await context.GetOrCreateSchemaAsync(typeof(ValidationProblemDetails), null, ct);
        var document = context.Document ?? throw new InvalidOperationException("The OpenAPI document is required.");
        schema.Properties ??= new Dictionary<string, IOpenApiSchema>();
        foreach (var property in new[] { "code", "message", "traceId" })
            schema.Properties.TryAdd(property, new OpenApiSchema { Type = JsonSchemaType.String });
        document.Components ??= new OpenApiComponents();
        document.Components.Schemas ??= new Dictionary<string, IOpenApiSchema>();
        document.Components.Schemas.TryAdd("ApiError", schema);
        operation.Responses ??= new OpenApiResponses();
        foreach (var status in new[] { 400, 401, 403, 404, 405, 409, 413, 415, 429, 500 })
        {
            var description = status switch
            {
                400 => "Invalid JSON, missing fields, invalid types or business validation. Check errors for field details.",
                401 => "Missing, invalid, expired or revoked authentication (Bearer token or X-Game-Key).",
                403 => "Authenticated caller does not have the required role.",
                404 => "Route or requested resource does not exist.",
                405 => "HTTP method not supported for this route.",
                409 => "Resource state, revision, uniqueness or references conflict with this action.",
                413 => "Request body exceeds the configured limit.",
                415 => "Unsupported Content-Type; send application/json for JSON bodies.",
                429 => "Rate limit exceeded on endpoints with a rate-limit policy.",
                _ => "Unexpected server error. Report traceId; internal exception details are not returned."
            };
            operation.Responses[status.ToString()] = new OpenApiResponse
            {
                Description = description + " JSON includes code, message, traceId and optional errors. These are possible infrastructure/business responses, not a promise that every action produces each status. See docs/api-errors.md for endpoint-specific cases.",
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["application/problem+json"] = new() { Schema = new OpenApiSchemaReference("ApiError", document) }
                }
            };
        }
    }
}
