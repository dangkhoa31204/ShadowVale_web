using System.Text.Json.Nodes;
using ShadowVale.BLL.DTOs.Content;

namespace ShadowVale.BLL.Interfaces;

public interface IContentBundleValidator
{
    IReadOnlyList<ContentValidationIssue> Validate(JsonObject bundle);
}
