using System.Reflection;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using ShadowVale.API.Authentication;
using ShadowVale.API.Controllers;
using ShadowVale.API.Middlewares;
using ShadowVale.API.OpenApi;
using ShadowVale.API.Options;
using ShadowVale.BLL;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Options;
using ShadowVale.BLL.Services;

var builder = WebApplication.CreateBuilder(args);

// Build-time OpenAPI generation (docs/openapi.json) starts this app without secrets. It never serves a request or
// opens the database, so placeholders let startup validation pass, and the seeders below are skipped.
var generatingOpenApi = Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider";
if (generatingOpenApi)
{
    builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
    {
        ["ConnectionStrings:Default"] = "Host=openapi-generation.invalid",
        ["Jwt:Key"] = "openapi-generation-placeholder-key-000",
        ["Game:ApiKeys:0"] = "openapi-generation-placeholder-key-000"
    });
}

// Secrets (Supabase connection string, JWT key, seed admin) come from user-secrets in dev, env vars in prod
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:Default (see backend README).");

builder.Services.AddBll(connectionString);

// Fails at startup with a clear message if Jwt:Key is missing or shorter than 32 characters
builder.Services.AddOptions<JwtOptions>()
    .BindConfiguration(JwtOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddOptions<SeedAdminOptions>()
    .BindConfiguration(SeedAdminOptions.SectionName);
builder.Services.AddOptions<GameOptions>()
    .BindConfiguration(GameOptions.SectionName)
    .Validate(o => o.IsValid(), $"Game:ApiKeys needs at least one key, each at least {GameOptions.MinKeyLength} characters (see backend README).")
    .ValidateOnStart();
builder.Services.AddOptions<RateLimitOptions>()
    .BindConfiguration(RateLimitOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddControllers().ConfigureApiBehaviorOptions(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var problem = new Microsoft.AspNetCore.Mvc.ValidationProblemDetails(context.ModelState)
        {
            Status = 400, Title = "Validation failed", Detail = "Please check the submitted fields.",
            Instance = context.HttpContext.Request.Path
        };
        problem.Extensions["code"] = "VALIDATION_FAILED";
        problem.Extensions["message"] = problem.Detail;
        problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
        var response = new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(problem);
        response.ContentTypes.Add("application/problem+json");
        return response;
    };
});
builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
{
    var problem = context.ProblemDetails;
    var (code, message) = problem.Status switch
    {
        400 => ("VALIDATION_FAILED", "Please check the submitted fields."),
        401 => ("UNAUTHORIZED", "Authentication is required or the access token is invalid or expired."),
        403 => ("FORBIDDEN", "You do not have permission to perform this action."),
        404 => ("NOT_FOUND", "The requested resource was not found."),
        409 => ("CONFLICT", "The request conflicts with the current resource state."),
        429 => ("AUTH_RATE_LIMITED", "Too many requests. Please wait before trying again."),
        _ => ("INTERNAL_ERROR", "An unexpected error occurred. Please try again later.")
    };
    problem.Extensions.TryAdd("code", code);
    // Never send internal exception messages (including database errors) to clients.
    problem.Extensions["message"] = problem.Status >= 500 ? message : problem.Detail ?? message;
    if (problem.Status >= 500) problem.Detail = message;
    else problem.Detail ??= message;
    problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
    options.AddDocumentTransformer<GameKeySecurityTransformer>();
    options.AddOperationTransformer<GameKeySecurityTransformer>();
});

// JWT is the default scheme (web users); the game key scheme is only used by the Game policy
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var subject = context.Principal?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            var role = context.Principal?.FindFirst(TokenService.RoleClaim)?.Value;
            var session = context.Principal?.FindFirst(TokenService.SessionClaim)?.Value;
            if (!Guid.TryParse(subject, out var userId) || !Guid.TryParse(session, out var sessionId) || role is null ||
                !await context.HttpContext.RequestServices.GetRequiredService<IUserService>()
                    .IsAccessAllowedAsync(userId, role, context.HttpContext.RequestAborted) ||
                !await context.HttpContext.RequestServices.GetRequiredService<IAuthService>()
                    .IsSessionActiveAsync(sessionId, userId, context.HttpContext.RequestAborted))
                context.Fail("The account or login session is no longer valid. Log in again.");
        }
    };
})
    .AddScheme<AuthenticationSchemeOptions, GameKeyAuthenticationHandler>(GameKeyAuthenticationHandler.SchemeName, null);
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((bearer, jwtOptions) =>
    {
        var jwt = jwtOptions.Value;

        // Keep claim names exactly as TokenService writes them ("sub", "role") instead of mapping to long URIs
        bearer.MapInboundClaims = false;
        bearer.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = JwtRegisteredClaimNames.UniqueName,
            RoleClaimType = TokenService.RoleClaim
        };
    });
builder.Services.AddAuthorization(options => options.AddPolicy(AuthPolicies.Game, policy => policy
    .AddAuthenticationSchemes(GameKeyAuthenticationHandler.SchemeName)
    .RequireAuthenticatedUser()));

// Fixed window per client IP; limits come from RateLimits (auth: brute-force protection on login/refresh, game: anti-spam)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    AddPerIpPolicy(options, AuthController.RateLimitPolicy, limits => limits.Auth);
    AddPerIpPolicy(options, GameController.RateLimitPolicy, limits => limits.Game);
});

const string FrontendCorsPolicy = "Frontend";
builder.Services.AddCors(options => options.AddPolicy(FrontendCorsPolicy, policy => policy
    .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

// Behind Render's proxy: take the real client IP/scheme from X-Forwarded-*, otherwise the rate limiter
// sees every user as the proxy's IP. The proxy's address isn't fixed, so trust any forwarder.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

// Startup seeding: the first Admin (if SeedAdmin is configured and none exists yet) and the solver configurations
// (if the table is empty). A database outage here must not stop the API from starting (/health will report it).
if (!generatingOpenApi)
{
    await RunSeederAsync<IAdminSeeder>(app, "initial admin", (seeder, ct) => seeder.SeedAsync(ct));
    await RunSeederAsync<ISolverConfigurationSeeder>(app, "solver configurations", (seeder, ct) => seeder.SeedAsync(ct));
    // FAKE telemetry for building the dashboards: only in Development and only when Seed:DemoData=true
    if (app.Environment.IsDevelopment() && app.Configuration.GetValue<bool>("Seed:DemoData"))
        await RunSeederAsync<IDemoDataSeeder>(app, "demo data", (seeder, ct) => seeder.SeedAsync(ct));
}

// Runs first so every later middleware (rate limiter, HTTPS redirect, logging) sees the real client IP and scheme
app.UseForwardedHeaders();

// Catches exceptions from everything after it
app.UseExceptionHandler();
app.UseStatusCodePages(); // bare 401/403/404/429 from the framework also get a ProblemDetails body

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(); // UI at /scalar
}

app.UseHttpsRedirection();

app.UseCors(FrontendCorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

await app.RunAsync();

static async Task RunSeederAsync<TSeeder>(WebApplication app, string what, Func<TSeeder, CancellationToken, Task> seed) where TSeeder : notnull
{
    try
    {
        await using var scope = app.Services.CreateAsyncScope();
        await seed(scope.ServiceProvider.GetRequiredService<TSeeder>(), app.Lifetime.ApplicationStopping);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Seeding the {What} failed", what);
    }
}

static void AddPerIpPolicy(RateLimiterOptions options, string policyName, Func<RateLimitOptions, RateLimitOptions.FixedWindow> select) =>
    options.AddPolicy(policyName, httpContext =>
    {
        var window = select(httpContext.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value);
        return RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = window.PermitLimit, Window = TimeSpan.FromSeconds(window.WindowSeconds) });
    });
