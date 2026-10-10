using System.Net;
using Microsoft.EntityFrameworkCore;
using ShadowVale.DAL.Entities;
using ShadowVale.IntegrationTests.Infrastructure;
using Shouldly;

namespace ShadowVale.IntegrationTests.Platform;

public class PlatformTests(ApiFixture api) : IntegrationTest(api)
{
    [DbFact]
    public async Task Migrations_AreAllApplied()
    {
        var pending = await Api.WithDbAsync(db => db.Database.GetPendingMigrationsAsync());

        pending.ShouldBeEmpty();
    }

    [DbFact]
    public async Task Health_WithDatabase_ReturnsHealthy()
    {
        var response = await Api.CreateClient().GetAsync("/health");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync()).ShouldBe("Healthy");
    }

    [DbFact]
    public async Task ProtectedEndpoint_WithLoggedInAdmin_Succeeds()
    {
        var admin = await Api.CreateUserClientAsync(UserRole.Admin);

        var response = await admin.GetAsync("/api/users");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }
}
