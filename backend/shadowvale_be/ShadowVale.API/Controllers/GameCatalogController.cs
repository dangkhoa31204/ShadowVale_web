using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShadowVale.BLL.Constants;
using ShadowVale.BLL.Services;

namespace ShadowVale.API.Controllers;

[ApiController]
[Route("api/game-catalog")]
[Authorize(Roles = AppRoles.Designer)]
public class GameCatalogController(GameCatalogService catalog) : ControllerBase
{
    [HttpGet]
    public ActionResult<JsonElement> Get() => Ok(JsonSerializer.SerializeToElement(GameCatalogService.GetSnapshot()));

    [HttpGet("comparison")]
    public async Task<ActionResult<JsonElement>> Comparison(CancellationToken ct) =>
        Ok(JsonSerializer.SerializeToElement(await catalog.ComparePublishedAsync(ct)));
}
