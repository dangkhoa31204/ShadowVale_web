using NSubstitute;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ShadowVale.BLL.DTOs.Users;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class UserServiceTests
{
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly IRefreshTokenRepository _refreshTokens = Substitute.For<IRefreshTokenRepository>();
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _sut = new UserService(_users, _refreshTokens, TestHelpers.PasswordHasher, TestHelpers.FixedTime());
        _users.ExecuteInTransactionAsync(Arg.Any<Func<Task>>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Func<Task>>()());
    }

    [Fact]
    public async Task Update_missing_active_flag_does_not_mutate_or_save()
    {
        var user = TestHelpers.User();
        _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);
        await Should.ThrowAsync<ValidationException>(() => _sut.UpdateAsync(user.Id,
            new() { Email = user.Email, Role = "Designer" }, Guid.NewGuid()));
        user.IsActive.ShouldBeTrue();
        await _users.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(0, 20)]
    [InlineData(int.MaxValue, 100)]
    [InlineData(1, 101)]
    public async Task Invalid_pagination_is_rejected_before_query(int page, int size)
    {
        await Should.ThrowAsync<ValidationException>(() => _sut.GetUsersAsync(new() { Page = page, PageSize = size }));
        await _users.DidNotReceive().SearchAsync(Arg.Any<string>(), Arg.Any<UserRole?>(), Arg.Any<bool?>(), Arg.Any<int>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("ix_users_username")]
    [InlineData("ix_users_email")]
    public async Task Concurrent_duplicate_create_returns_conflict(string constraint)
    {
        _users.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns<int>(_ => throw new DbUpdateException("Duplicate",
            new PostgresException("Duplicate", "ERROR", "ERROR", PostgresErrorCodes.UniqueViolation, constraintName: constraint)));
        await Should.ThrowAsync<ConflictException>(() => _sut.CreateAsync(ValidCreateRequest()));
    }

    [Fact]
    public async Task Concurrent_duplicate_email_update_returns_conflict()
    {
        var user = TestHelpers.User();
        _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);
        _users.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns<int>(_ => throw new DbUpdateException("Duplicate",
            new PostgresException("Duplicate", "ERROR", "ERROR", PostgresErrorCodes.UniqueViolation, constraintName: "ix_users_email")));
        await Should.ThrowAsync<ConflictException>(() => _sut.UpdateAsync(user.Id,
            new() { Email = "changed@example.test", Role = "Designer", IsActive = true }, Guid.NewGuid()));
    }

    [Theory]
    [InlineData(true, "Admin", "Admin", true)]
    [InlineData(false, "Admin", "Admin", false)]
    [InlineData(true, "Designer", "Admin", false)]
    [InlineData(true, "Analyst", "Analyst", true)]
    public async Task Access_validation_checks_live_account_and_role(bool active, string role, string claim, bool expected)
    {
        var user = TestHelpers.User(role: Enum.Parse<UserRole>(role)); user.IsActive = active;
        _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);
        (await _sut.IsAccessAllowedAsync(user.Id, claim)).ShouldBe(expected);
        (await _sut.IsAccessAllowedAsync(Guid.NewGuid(), claim)).ShouldBeFalse();
    }

    [Fact]
    public async Task Password_reset_saves_and_revokes_inside_transaction()
    {
        var user = TestHelpers.User();
        _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);
        await _sut.ResetPasswordAsync(user.Id, new() { NewPassword = "NewPassword123!" });
        await _users.Received(1).ExecuteInTransactionAsync(Arg.Any<Func<Task>>(), Arg.Any<CancellationToken>());
        await _users.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        await _refreshTokens.Received(1).RevokeAllForUserAsync(user.Id, TestHelpers.Now, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Failed_token_revocation_propagates_from_transaction()
    {
        var user = TestHelpers.User();
        _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);
        _refreshTokens.RevokeAllForUserAsync(user.Id, Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new InvalidOperationException("Revoke failed"));
        await Should.ThrowAsync<InvalidOperationException>(() => _sut.UpdateAsync(user.Id,
            new() { Email = user.Email, Role = "Analyst", IsActive = true }, Guid.NewGuid()));
        await _users.Received(1).ExecuteInTransactionAsync(Arg.Any<Func<Task>>(), Arg.Any<CancellationToken>());
    }

    private static CreateUserRequest ValidCreateRequest(string role = "Designer") => new()
    {
        Username = "NewDesigner",
        Email = "New.Designer@ShadowVale.test",
        Password = "Password123!",
        Role = role
    };

    [Fact]
    public async Task Create_WithValidRequest_StoresNormalizedUserWithHashedPassword()
    {
        var result = await _sut.CreateAsync(ValidCreateRequest(role: "designer"));

        result.Username.ShouldBe("newdesigner");
        result.Email.ShouldBe("new.designer@shadowvale.test");
        result.Role.ShouldBe("Designer");
        await _users.Received(1).AddAsync(
            Arg.Is<User>(u => u.PasswordHash != "Password123!" && u.Role == UserRole.Designer),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Create_WithTakenUsername_ThrowsConflict()
    {
        _users.UsernameExistsAsync("newdesigner", Arg.Any<CancellationToken>()).Returns(true);

        await Should.ThrowAsync<ConflictException>(() => _sut.CreateAsync(ValidCreateRequest()));
        await _users.DidNotReceive().AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("Player")]
    [InlineData("1")]
    [InlineData("Admin, Analyst")]
    public async Task Create_WithUnknownRole_ThrowsValidation(string role)
    {
        var ex = await Should.ThrowAsync<ValidationException>(() => _sut.CreateAsync(ValidCreateRequest(role)));

        ex.Errors.ShouldContainKey("Role");
    }

    [Theory]
    [InlineData("Designer", true)]
    [InlineData("Admin", false)]
    public async Task Update_RemovingOwnAdminAccess_ThrowsConflict(string role, bool isActive)
    {
        var admin = TestHelpers.User(role: UserRole.Admin);
        _users.GetByIdAsync(admin.Id, Arg.Any<CancellationToken>()).Returns(admin);

        await Should.ThrowAsync<ConflictException>(() => _sut.UpdateAsync(admin.Id,
            new UpdateUserRequest { Email = admin.Email, Role = role, IsActive = isActive }, currentUserId: admin.Id));
    }

    [Fact]
    public async Task Update_ChangingRole_RevokesThatUsersSessions()
    {
        var user = TestHelpers.User(role: UserRole.Designer);
        _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);

        await _sut.UpdateAsync(user.Id,
            new UpdateUserRequest { Email = user.Email, Role = "Analyst", IsActive = true }, currentUserId: Guid.NewGuid());

        user.Role.ShouldBe(UserRole.Analyst);
        await _refreshTokens.Received(1).RevokeAllForUserAsync(user.Id, TestHelpers.Now, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Update_OnlyChangingName_KeepsSessions()
    {
        var user = TestHelpers.User(role: UserRole.Designer);
        _users.GetByIdAsync(user.Id, Arg.Any<CancellationToken>()).Returns(user);

        await _sut.UpdateAsync(user.Id,
            new UpdateUserRequest { Email = user.Email, FullName = "New Name", Role = "Designer", IsActive = true },
            currentUserId: Guid.NewGuid());

        await _refreshTokens.DidNotReceive().RevokeAllForUserAsync(Arg.Any<Guid>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetById_WithUnknownId_ThrowsNotFound()
    {
        await Should.ThrowAsync<NotFoundException>(() => _sut.GetByIdAsync(Guid.NewGuid()));
    }
}
