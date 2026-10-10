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

    [DbFact]
    public async Task Designer_CanReadButNotChange()
    {
        var designer = await Api.CreateUserClientAsync(UserRole.Designer);

        (await designer.GetAsync(Url)).StatusCode.ShouldBe(HttpStatusCode.OK);
        var create = await designer.PostAsJsonAsync(Url, new CreateSolverConfigurationRequest
        {
            Code = "greedy", Name = "Greedy", Algorithm = "Greedy", TimeBudgetMs = 120
        });
        create.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [DbFact]
    public async Task Analyst_CreateActivateAndDelete()
    {
        var analyst = await Api.CreateUserClientAsync(UserRole.Analyst);

        var created = await analyst.PostAsJsonAsync(Url, new CreateSolverConfigurationRequest
        {
            Code = "sqa_fast", Name = "SQA fast", Algorithm = "sqa", TimeBudgetMs = 120,
            Params = new() { ["sweeps"] = Json("200") }
        });
        created.StatusCode.ShouldBe(HttpStatusCode.Created);
        var dto = (await created.Content.ReadFromJsonAsync<SolverConfigurationDto>())!;
        dto.Variant.ShouldBe("sqa");
        dto.Family.ShouldBe("QuantumInspired");
        dto.Params.GetProperty("sweeps").GetInt32().ShouldBe(200);

        var activated = await analyst.PatchAsJsonAsync($"{Url}/{dto.Id}/active", new SetSolverConfigurationActiveRequest { IsActive = true });
        (await activated.Content.ReadFromJsonAsync<SolverConfigurationDto>())!.IsAbArm.ShouldBeTrue();

        (await analyst.DeleteAsync($"{Url}/{dto.Id}")).StatusCode.ShouldBe(HttpStatusCode.NoContent);
        (await analyst.GetAsync($"{Url}/{dto.Id}")).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [DbFact]
    public async Task Create_WithUnknownParam_Returns400WithField()
    {
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);

        var response = await admin.PostAsJsonAsync(Url, new CreateSolverConfigurationRequest
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
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);
        var request = new CreateSolverConfigurationRequest { Code = "ga", Name = "GA", Algorithm = "Genetic", TimeBudgetMs = 120 };

        (await admin.PostAsJsonAsync(Url, request)).StatusCode.ShouldBe(HttpStatusCode.Created);
        (await admin.PostAsJsonAsync(Url, request)).StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [DbFact]
    public async Task Seeder_OnEmptyTable_CreatesVariantsWithGreedyAndSqaActive()
    {
        await Api.SeedSolverConfigurationsAsync();
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);

        var all = (await admin.GetFromJsonAsync<List<SolverConfigurationDto>>(Url))!;

        all.Select(c => c.Code).ShouldBe(["ga", "greedy", "qaoa", "qiea", "sa", "sqa"]);
        all.Where(c => c.IsActive).Select(c => c.Code).ShouldBe(["greedy", "sqa"]);
        all.ShouldAllBe(c => c.TimeBudgetMs == 120 && c.Code == c.Variant);
    }
}
