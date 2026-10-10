using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using ShadowVale.API.Authentication;

namespace ShadowVale.API.OpenApi;

// Game endpoints use X-Game-Key instead of the JWT: declare the key scheme and attach it only to those operations,
// so Scalar shows a key field there (an operation-level requirement replaces the document-wide Bearer one)
public sealed class GameKeySecurityTransformer : IOpenApiDocumentTransformer, IOpenApiOperationTransformer
{
    private const string SchemeId = "GameKey";

    public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes[SchemeId] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.ApiKey,
            In = ParameterLocation.Header,
            Name = GameKeyAuthenticationHandler.HeaderName,
            Description = "Key built into the game (config Game:ApiKeys)"
        };
        return Task.CompletedTask;
    }

    public Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
    {
        var usesGameKey = context.Description.ActionDescriptor.EndpointMetadata
            .OfType<IAuthorizeData>()
            .Any(a => a.Policy == AuthPolicies.Game);

        if (usesGameKey)
        {
            operation.Security =
            [
                new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference(SchemeId, context.Document)] = [] }
            ];
        }

        return Task.CompletedTask;
    }
}
