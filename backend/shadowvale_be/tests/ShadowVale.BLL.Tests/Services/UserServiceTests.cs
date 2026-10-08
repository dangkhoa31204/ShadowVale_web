using NSubstitute;
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
