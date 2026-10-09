using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShadowVale.BLL.DTOs.Meta;
using ShadowVale.BLL.Interfaces;

namespace ShadowVale.API.Controllers;

[ApiController]
[Route("api/meta")]
[Authorize]
public class MetaController(IMetaService meta) : ControllerBase
{
    [HttpGet("enums")]
    public ActionResult<EnumsDto> GetEnums() => Ok(meta.GetEnums());
}
