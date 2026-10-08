using Microsoft.AspNetCore.Identity;
using ShadowVale.BLL.DTOs.Auth;
using ShadowVale.BLL.DTOs.Users;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Mappings;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services;

public class AuthService(
    IUserRepository users,
    IRefreshTokenRepository refreshTokens,
    IPasswordHasher<User> passwordHasher,
    ITokenService tokenService,
    TimeProvider time) : IAuthService
{
    // Same message for unknown user and wrong password, so the API does not reveal which usernames exist
    private const string InvalidCredentials = "Invalid username or password.";
    private const string InvalidRefreshToken = "Invalid or expired refresh token.";

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await users.GetByUsernameOrEmailAsync(UserMappings.NormalizeIdentifier(request.UsernameOrEmail), ct)
            ?? throw new UnauthorizedException(InvalidCredentials);

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            throw new UnauthorizedException(InvalidCredentials);

        if (!user.IsActive)
            throw new ForbiddenException("This account has been deactivated.");

        // Hash was made with older hasher settings: upgrade it while we have the plain password
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        user.LastLoginAt = Now;
        return await IssueTokensAsync(user, ct);
    }

    public async Task<AuthResponse> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        var stored = await refreshTokens.GetByHashWithUserAsync(tokenService.HashRefreshToken(refreshToken), ct)
            ?? throw new UnauthorizedException(InvalidRefreshToken);

        if (stored.RevokedAt is not null)
        {
            // A rotated-out token being replayed means it was stolen (or the client is buggy):
            // end every session of this user so the thief's copy dies too
            await refreshTokens.RevokeAllForUserAsync(stored.UserId, Now, ct);
            throw new UnauthorizedException(InvalidRefreshToken);
        }

        if (stored.ExpiresAt <= Now || !stored.User.IsActive)
            throw new UnauthorizedException(InvalidRefreshToken);

        // Rotation: each refresh token works exactly once
        stored.RevokedAt = Now;
        return await IssueTokensAsync(stored.User, ct);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var stored = await refreshTokens.GetByHashWithUserAsync(tokenService.HashRefreshToken(refreshToken), ct);

        // Idempotent: logging out with an unknown or already-revoked token is not an error
        if (stored is null || stored.RevokedAt is not null)
            return;

        stored.RevokedAt = Now;
        await refreshTokens.SaveChangesAsync(ct);
    }

    public async Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct) ?? throw new NotFoundException(nameof(User), userId);
        return user.ToDto();
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct) ?? throw new NotFoundException(nameof(User), userId);

        if (passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword) == PasswordVerificationResult.Failed)
            throw new ValidationException(nameof(request.CurrentPassword), "Current password is incorrect.");

        user.PasswordHash = passwordHasher.HashPassword(user, request.NewPassword);
        await users.SaveChangesAsync(ct);

        // Sign out every other device
        await refreshTokens.RevokeAllForUserAsync(user.Id, Now, ct);
    }

    private DateTime Now => time.GetUtcNow().UtcDateTime;

    private async Task<AuthResponse> IssueTokensAsync(User user, CancellationToken ct)
    {
        var (accessToken, accessExpiresAt) = tokenService.CreateAccessToken(user);
        var (refreshToken, refreshHash, refreshExpiresAt) = tokenService.CreateRefreshToken();

        await refreshTokens.AddAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = refreshExpiresAt
        }, ct);

        // Repositories share the scoped DbContext, so this also saves pending User changes
        await refreshTokens.SaveChangesAsync(ct);

        return new AuthResponse(accessToken, accessExpiresAt, refreshToken, refreshExpiresAt, user.ToDto());
    }
}
