using NSubstitute;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Repositories.Interfaces;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class AnalyticsContentVersionTests
{
    private readonly IAnalyticsRepository _analytics = Substitute.For<IAnalyticsRepository>();
    private readonly IGameContentRepository _content = Substitute.For<IGameContentRepository>();

    [Fact]
    public async Task Content_versions_list_only_published_versions_with_the_live_one_marked()
    {
        var live = Guid.NewGuid();
        var archived = Guid.NewGuid();
        _content.GetEverPublishedVersionsAsync(Arg.Any<CancellationToken>()).Returns([
            new PublishedVersionRow(live, 3, "Balance pass", new DateTime(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc), true),
            new PublishedVersionRow(archived, 1, "Initial", new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc), false),
        ]);

        var versions = await new AnalyticsService(_analytics, _content).GetContentVersionsAsync();

        versions.Select(v => (v.Id, v.VersionNo, v.Label, v.IsLive)).ShouldBe([(live, 3L, "Balance pass", true), (archived, 1L, "Initial", false)]);
    }
}
