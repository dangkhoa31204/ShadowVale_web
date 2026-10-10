using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ShadowVale.API.Extensions;
using ShadowVale.BLL.DTOs.Auth;
using ShadowVale.BLL.DTOs.Users;
using ShadowVale.BLL.Interfaces;

namespace ShadowVale.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    // Rate-limit policy for the anonymous endpoints that accept secrets (see Program.cs)
    public const string RateLimitPolicy = "auth";

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicy)]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var result = await authService.LoginAsync(request, ct);
        if (result.Failure is null) return Ok(result.Data);
        var disabled = result.Failure == LoginFailure.AccountDeactivated;
        var message = disabled ? "This account has been deactivated." : "Invalid username or password.";
        var problem = new ProblemDetails
        {
            Status = disabled ? StatusCodes.Status403Forbidden : StatusCodes.Status401Unauthorized,
            Title = disabled ? "Forbidden" : "Unauthorized",
            Detail = message, Instance = Request.Path
        };
        problem.Extensions["code"] = disabled ? "ACCOUNT_DEACTIVATED" : "INVALID_CREDENTIALS";
        problem.Extensions["message"] = message;
        problem.Extensions["traceId"] = HttpContext.TraceIdentifier;
        var response = new ObjectResult(problem) { StatusCode = problem.Status };
        response.ContentTypes.Add("application/problem+json");
        return response;
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicy)]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshTokenRequest request, CancellationToken ct) =>
        Ok(await authService.RefreshAsync(request.RefreshToken, ct));

    // Anonymous on purpose: logging out must work even after the access token has expired
    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(RefreshTokenRequest request, CancellationToken ct)
    {
        await authService.LogoutAsync(request.RefreshToken, ct);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me(CancellationToken ct) =>
        Ok(await authService.GetCurrentUserAsync(User.GetUserId(), ct));

    [HttpPut("me/password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        await authService.ChangePasswordAsync(User.GetUserId(), request, ct);
        return NoContent();
    }
}
