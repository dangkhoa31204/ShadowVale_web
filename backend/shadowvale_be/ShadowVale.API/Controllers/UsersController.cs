using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShadowVale.API.Extensions;
using ShadowVale.BLL.Constants;
using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.DTOs.Users;
using ShadowVale.BLL.Interfaces;

namespace ShadowVale.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = AppRoles.Admin)]
public class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<UserDto>>> GetUsers([FromQuery] UserQuery query, CancellationToken ct) =>
        Ok(await userService.GetUsersAsync(query, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserDto>> GetById(Guid id, CancellationToken ct) =>
        Ok(await userService.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(CreateUserRequest request, CancellationToken ct)
    {
        var user = await userService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    // Also how accounts are disabled (IsActive = false): users are never hard-deleted,
    // because content versions and approvals keep pointing at who made them
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserDto>> Update(Guid id, UpdateUserRequest request, CancellationToken ct) =>
        Ok(await userService.UpdateAsync(id, request, User.GetUserId(), ct));

    [HttpPut("{id:guid}/password")]
    public async Task<IActionResult> ResetPassword(Guid id, ResetPasswordRequest request, CancellationToken ct)
    {
        await userService.ResetPasswordAsync(id, request, ct);
        return NoContent();
    }
}
