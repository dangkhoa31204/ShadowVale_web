using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ShadowVale.BLL.DTOs.Solvers;
using ShadowVale.DAL.Entities;
using ShadowVale.IntegrationTests.Infrastructure;
using Shouldly;

namespace ShadowVale.IntegrationTests.Solvers;

public class SolverConfigurationApiTests(ApiFixture api) : IntegrationTest(api)
{
    private const string Url = "/api/solver-configurations";

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    [DbTheory]
    [InlineData(UserRole.Admin)]
    [InlineData(UserRole.Analyst)]
    public async Task OtherRoles_CanReadButCannotChangeGameplayConfiguration(UserRole role)
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var reader = await Api.CreateUserClientAsync(role);
        var created = await designer.PostAsJsonAsync(Url, new CreateSolverConfigurationRequest
        {
            Code = "greedy", Name = "Greedy", Algorithm = "Greedy", TimeBudgetMs = 120
        });
        created.StatusCode.ShouldBe(HttpStatusCode.Created);
        var dto = (await created.Content.ReadFromJsonAsync<SolverConfigurationDto>())!;
        (await reader.GetAsync(Url)).StatusCode.ShouldBe(HttpStatusCode.OK);
        (await reader.GetAsync($"{Url}/{dto.Id}")).StatusCode.ShouldBe(HttpStatusCode.OK);
        (await reader.PostAsJsonAsync(Url, new { })).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await reader.PutAsJsonAsync($"{Url}/{dto.Id}", new { })).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await reader.PostAsJsonAsync($"{Url}/{dto.Id}/clone", new { })).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await reader.PatchAsJsonAsync($"{Url}/{dto.Id}/active", new { isActive = true })).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        (await reader.DeleteAsync($"{Url}/{dto.Id}")).StatusCode.ShouldBe(HttpStatusCode.Forbidden);
        var after = (await designer.GetFromJsonAsync<SolverConfigurationDto>($"{Url}/{dto.Id}"))!;
        after.TimeBudgetMs.ShouldBe(120);
        after.IsActive.ShouldBeFalse();
    }

    [DbFact]
    public async Task Designer_CreateActivateAndDelete()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);

        var created = await designer.PostAsJsonAsync(Url, new CreateSolverConfigurationRequest
        {
            Code = "sqa_fast", Name = "SQA fast", Algorithm = "sqa", TimeBudgetMs = 120,
            Params = new() { ["sweeps"] = Json("200") }
        });
        created.StatusCode.ShouldBe(HttpStatusCode.Created);
        var dto = (await created.Content.ReadFromJsonAsync<SolverConfigurationDto>())!;
        dto.Variant.ShouldBe("sqa");
        dto.Family.ShouldBe("QuantumInspired");
        dto.Params.GetProperty("sweeps").GetInt32().ShouldBe(200);

        var activated = await designer.PatchAsJsonAsync($"{Url}/{dto.Id}/active", new SetSolverConfigurationActiveRequest { IsActive = true });
        (await activated.Content.ReadFromJsonAsync<SolverConfigurationDto>())!.IsAbArm.ShouldBeTrue();

        (await designer.DeleteAsync($"{Url}/{dto.Id}")).StatusCode.ShouldBe(HttpStatusCode.NoContent);
        (await designer.GetAsync($"{Url}/{dto.Id}")).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [DbFact]
    public async Task Create_WithUnknownParam_Returns400WithField()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);

        var response = await designer.PostAsJsonAsync(Url, new CreateSolverConfigurationRequest
        {
            Code = "qaoa_bad", Name = "QAOA", Algorithm = "Qaoa", TimeBudgetMs = 120,
            Params = new() { ["trotter"] = Json("8") }
        });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).ShouldContain("Params.trotter");
    }

    [DbFact]
    public async Task Create_WithDuplicateCode_Returns409()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);
        var request = new CreateSolverConfigurationRequest { Code = "ga", Name = "GA", Algorithm = "Genetic", TimeBudgetMs = 120 };

        (await designer.PostAsJsonAsync(Url, request)).StatusCode.ShouldBe(HttpStatusCode.Created);
        (await designer.PostAsJsonAsync(Url, request)).StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [DbFact]
    public async Task Seeder_OnEmptyTable_CreatesVariantsWithGreedyAndSqaActive()
    {
        await Api.SeedSolverConfigurationsAsync();
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);

        var all = (await admin.GetFromJsonAsync<List<SolverConfigurationDto>>(Url))!;

        all.Select(c => c.Code).ShouldBe(["ga", "greedy", "qaoa", "qiea", "sa", "sqa", "tabu"]);
        all.Where(c => c.IsActive).Select(c => c.Code).ShouldBe(["greedy", "sqa"]);
        all.ShouldAllBe(c => c.TimeBudgetMs == 120 && c.Code == c.Variant);
    }
}
