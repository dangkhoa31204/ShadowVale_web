using Microsoft.AspNetCore.Identity;
using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.DTOs.Users;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Mappings;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services;

// Admin-only account management. There is no public sign-up: Designers and Analysts are created here.
public class UserService(
    IUserRepository users,
    IRefreshTokenRepository refreshTokens,
    IPasswordHasher<User> passwordHasher,
    TimeProvider time) : IUserService
{
    public async Task<PagedResult<UserDto>> GetUsersAsync(UserQuery query, CancellationToken ct = default)
    {
        var role = string.IsNullOrWhiteSpace(query.Role) ? (UserRole?)null : UserMappings.ParseRole(query.Role);

        var (items, total) = await users.SearchAsync(query.Search, role, query.IsActive, query.Page, query.PageSize, ct);
        return new PagedResult<UserDto>(items.Select(u => u.ToDto()).ToList(), query.Page, query.PageSize, total);
    }

    public async Task<UserDto> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        (await FindAsync(id, ct)).ToDto();

    public async Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        var role = UserMappings.ParseRole(request.Role);
        var username = UserMappings.NormalizeIdentifier(request.Username);
        var email = UserMappings.NormalizeIdentifier(request.Email);

        if (await users.UsernameExistsAsync(username, ct))
            throw new ConflictException($"Username '{username}' is already taken.");
        if (await users.EmailExistsAsync(email, ct: ct))
            throw new ConflictException($"Email '{email}' is already in use.");

        var user = new User
        {
            Username = username,
            Email = email,
            FullName = request.FullName?.Trim(),
            Role = role
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        await users.AddAsync(user, ct);
        await users.SaveChangesAsync(ct);
        return user.ToDto();
    }

    public async Task<UserDto> UpdateAsync(Guid id, UpdateUserRequest request, Guid currentUserId, CancellationToken ct = default)
    {
        var user = await FindAsync(id, ct);
        var role = UserMappings.ParseRole(request.Role);
        var email = UserMappings.NormalizeIdentifier(request.Email);

        // Stops the last admin from locking everyone out of user management
        if (id == currentUserId && (role != UserRole.Admin || !request.IsActive))
            throw new ConflictException("You cannot remove your own Admin role or deactivate your own account.");

        if (email != user.Email && await users.EmailExistsAsync(email, user.Id, ct))
            throw new ConflictException($"Email '{email}' is already in use.");

        var accessChanged = user.Role != role || user.IsActive != request.IsActive;

        user.Email = email;
        user.FullName = request.FullName?.Trim();
        user.Role = role;
        user.IsActive = request.IsActive;
        await users.SaveChangesAsync(ct);

        // Force a fresh login so the new role / disabled state applies once the current access token expires
        if (accessChanged)
            await refreshTokens.RevokeAllForUserAsync(user.Id, time.GetUtcNow().UtcDateTime, ct);

        return user.ToDto();
    }

    public async Task ResetPasswordAsync(Guid id, ResetPasswordRequest request, CancellationToken ct = default)
    {
        var user = await FindAsync(id, ct);

        user.PasswordHash = passwordHasher.HashPassword(user, request.NewPassword);
        await users.SaveChangesAsync(ct);
        await refreshTokens.RevokeAllForUserAsync(user.Id, time.GetUtcNow().UtcDateTime, ct);
    }

    private async Task<User> FindAsync(Guid id, CancellationToken ct) =>
        await users.GetByIdAsync(id, ct) ?? throw new NotFoundException(nameof(User), id);
}
