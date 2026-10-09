using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.DTOs.Common;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Services;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class AdminContentVersionTests
{
    private readonly IContentVersionRepository _repo = Substitute.For<IContentVersionRepository>();
    private readonly IContentBundleValidator _validator = Substitute.For<IContentBundleValidator>();
    private readonly ContentVersionService _service;
    private readonly Guid _actor = Guid.NewGuid();

    public AdminContentVersionTests()
    {
        _service = new(_repo, _validator, TestHelpers.FixedTime());
        _validator.Validate(Arg.Any<JsonObject>()).Returns(Array.Empty<ContentValidationIssue>());
    }

    private ContentVersion Version(ContentStatus status = ContentStatus.InReview)
    {
        var v = new ContentVersion { Label = "Weapon balance", Status = status, Revision = 4,
            ValidatedAt = TestHelpers.Now, SubmittedAt = TestHelpers.Now };
        v.Items.Add(new Item { Code = "rifle", Name = "Rifle", ContentVersionId = v.Id, Type = ItemType.Weapon,
            Weapon = new Weapon { Damage = 40, FireRate = 2 } });
        v.Items.First().Weapon!.ItemId = v.Items.First().Id;
        v.Bundle = ContentVersionService.CanonicalJson(ContentBundleBuilder.Build(v));
        v.BundleChecksum = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(v.Bundle)));
        _repo.GetByIdAsync(v.Id, Arg.Any<CancellationToken>()).Returns(v);
        _repo.GetSnapshotAsync(v.Id, Arg.Any<CancellationToken>()).Returns(v);
        return v;
    }

    [Fact]
    public async Task Submit_locks_validated_draft_and_preserves_bundle_for_admin_approval()
    {
        var v = Version(ContentStatus.Draft); var bundle = v.Bundle; var checksum = v.BundleChecksum;
        v.SubmittedAt = null;
        var result = await _service.SubmitAsync(v.Id, new() { Revision = 4 });
        result.Error.ShouldBeNull(); result.Data!.Status.ShouldBe("InReview");
        result.Data.SubmittedAt.ShouldBe(TestHelpers.Now); result.Data.Revision.ShouldBe(5);
        v.Bundle.ShouldBe(bundle); v.BundleChecksum.ShouldBe(checksum);
        (await _service.UpdateAsync(v.Id, new() { Label = "Changed", Revision = 5 })).Error!.Kind.ShouldBe(ServiceErrorKind.Conflict);
        (await _service.ValidateAsync(v.Id, new() { Revision = 5 })).Error!.Kind.ShouldBe(ServiceErrorKind.Conflict);
        (await _service.SubmitAsync(v.Id, new() { Revision = 5 })).Error!.Kind.ShouldBe(ServiceErrorKind.Conflict);
        var approved = await _service.ApproveAsync(v.Id, new() { Revision = 5, ReviewNote = "oke" }, _actor);
        approved.Error.ShouldBeNull(); approved.Data!.Status.ShouldBe("Approved"); approved.Data.Revision.ShouldBe(6);
        (await _service.PublishAsync(v.Id, new() { Revision = 6, Reason = "Release" }, _actor)).Error.ShouldBeNull();
        await _repo.Received(1).PublishAsync(v, _actor, "Release", TestHelpers.Now, Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(ContentStatus.InReview)]
    [InlineData(ContentStatus.Approved)]
    [InlineData(ContentStatus.Published)]
    [InlineData(ContentStatus.Rejected)]
    [InlineData(ContentStatus.Archived)]
    public async Task Submit_rejects_non_drafts(ContentStatus status)
    {
        var v = Version(status);
        (await _service.SubmitAsync(v.Id, new() { Revision = 4 })).Error!.Kind.ShouldBe(ServiceErrorKind.Conflict);
        await _repo.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(null, ServiceErrorKind.Validation)]
    [InlineData(-1L, ServiceErrorKind.Validation)]
    [InlineData(3L, ServiceErrorKind.Conflict)]
    [InlineData(long.MaxValue, ServiceErrorKind.Conflict)]
    public async Task Submit_requires_current_revision(long? revision, ServiceErrorKind kind)
    {
        var v = Version(ContentStatus.Draft);
        (await _service.SubmitAsync(v.Id, new() { Revision = revision })).Error!.Kind.ShouldBe(kind);
        v.Status.ShouldBe(ContentStatus.Draft);
        await _repo.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("unvalidated")]
    [InlineData("changed")]
    [InlineData("invalid")]
    public async Task Submit_rejects_unvalidated_changed_or_invalid_content(string problem)
    {
        var v = Version(ContentStatus.Draft); v.SubmittedAt = null;
        if (problem == "unvalidated") v.ValidatedAt = null;
        if (problem == "changed") v.Items.First().Weapon!.Damage = 99;
        if (problem == "invalid") _validator.Validate(Arg.Any<JsonObject>()).Returns(new[] { new ContentValidationIssue("/maps", "Safe Camp required") });
        (await _service.SubmitAsync(v.Id, new() { Revision = 4 })).Error!.Kind.ShouldBe(ServiceErrorKind.Validation);
        v.Status.ShouldBe(ContentStatus.Draft); v.SubmittedAt.ShouldBeNull(); v.Revision.ShouldBe(4);
        await _repo.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Submit_handles_missing_version_snapshot_changes_and_concurrent_write()
    {
        (await _service.SubmitAsync(Guid.NewGuid(), new() { Revision = 0 })).Error!.Kind.ShouldBe(ServiceErrorKind.NotFound);
        var v = Version(ContentStatus.Draft);
        _repo.GetSnapshotAsync(v.Id, Arg.Any<CancellationToken>()).Returns(new ContentVersion { Id = v.Id, Revision = 5 });
        (await _service.SubmitAsync(v.Id, new() { Revision = 4 })).Error!.Kind.ShouldBe(ServiceErrorKind.Conflict);
        _repo.GetSnapshotAsync(v.Id, Arg.Any<CancellationToken>()).Returns(v);
        _repo.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns<int>(_ => throw new DbUpdateConcurrencyException());
        (await _service.SubmitAsync(v.Id, new() { Revision = 4 })).Error!.Kind.ShouldBe(ServiceErrorKind.Conflict);
    }

    [Fact]
    public async Task Approval_records_admin_and_preserves_weapon_bundle()
    {
        var v = Version(); var bundle = v.Bundle;
        var result = await _service.ApproveAsync(v.Id, new() { Revision = 4, ReviewNote = " Balanced " }, _actor);
        result.Error.ShouldBeNull();
        v.Status.ShouldBe(ContentStatus.Approved); v.Revision.ShouldBe(5);
        v.ReviewedById.ShouldBe(_actor); v.ReviewedAt.ShouldBe(TestHelpers.Now);
        result.Data!.ReviewNote.ShouldBe("Balanced"); v.Bundle.ShouldBe(bundle);
        await _repo.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Rejection_requires_reason_and_can_reject_invalid_bundle()
    {
        var v = Version(); v.Bundle = null;
        (await _service.RejectAsync(v.Id, new() { Revision = 4, ReviewNote = " " }, _actor))
            .Error!.Kind.ShouldBe(ServiceErrorKind.Validation);
        v.Status.ShouldBe(ContentStatus.InReview);
        var result = await _service.RejectAsync(v.Id, new() { Revision = 4, ReviewNote = "Damage too high" }, _actor);
        result.Error.ShouldBeNull(); v.Status.ShouldBe(ContentStatus.Rejected);
        v.ReviewedById.ShouldBe(_actor); v.Revision.ShouldBe(5);
    }

    [Theory]
    [InlineData(ContentStatus.Draft)]
    [InlineData(ContentStatus.Approved)]
    [InlineData(ContentStatus.Published)]
    [InlineData(ContentStatus.Rejected)]
    [InlineData(ContentStatus.Archived)]
    public async Task Review_rejects_wrong_status(ContentStatus status)
    {
        var v = Version(status);
        (await _service.ApproveAsync(v.Id, new() { Revision = 4 }, _actor)).Error!.Kind.ShouldBe(ServiceErrorKind.Conflict);
        (await _service.RejectAsync(v.Id, new() { Revision = 4, ReviewNote = "No" }, _actor)).Error!.Kind.ShouldBe(ServiceErrorKind.Conflict);
        await _repo.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(null, ServiceErrorKind.Validation)]
    [InlineData(-1L, ServiceErrorKind.Validation)]
    [InlineData(3L, ServiceErrorKind.Conflict)]
    public async Task Review_and_publish_require_current_revision(long? revision, ServiceErrorKind kind)
    {
        var v = Version();
        (await _service.ApproveAsync(v.Id, new() { Revision = revision }, _actor)).Error!.Kind.ShouldBe(kind);
        (await _service.RejectAsync(v.Id, new() { Revision = revision, ReviewNote = "No" }, _actor)).Error!.Kind.ShouldBe(kind);
        v.Status = ContentStatus.Approved;
        (await _service.PublishAsync(v.Id, new() { Revision = revision, Reason = "Release" }, _actor)).Error!.Kind.ShouldBe(kind);
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("checksum")]
    [InlineData("content")]
    [InlineData("json")]
    [InlineData("schema")]
    public async Task Invalid_bundle_blocks_approval_and_publication(string problem)
    {
        var v = Version();
        switch (problem)
        {
            case "missing": v.ValidatedAt = null; break;
            case "checksum": v.BundleChecksum = "bad"; break;
            case "content": v.Items.First().Weapon!.Damage = 99; break;
            case "json": v.Bundle = "{"; break;
            case "schema": _validator.Validate(Arg.Any<JsonObject>()).Returns(new[] { new ContentValidationIssue("/weapons", "Invalid") }); break;
        }
        (await _service.ApproveAsync(v.Id, new() { Revision = 4 }, _actor)).Error!.Kind.ShouldBe(ServiceErrorKind.Validation);
        v.Status = ContentStatus.Approved;
        (await _service.PublishAsync(v.Id, new() { Revision = 4, Reason = "Release" }, _actor)).Error!.Kind.ShouldBe(ServiceErrorKind.Validation);
        await _repo.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        await _repo.DidNotReceive().PublishAsync(Arg.Any<ContentVersion>(), Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Jsonb_formatting_does_not_invalidate_checksum()
    {
        var v = Version(); v.Bundle = JsonNode.Parse(v.Bundle!)!.ToJsonString(new() { WriteIndented = true });
        (await _service.ApproveAsync(v.Id, new() { Revision = 4 }, _actor)).Error.ShouldBeNull();
    }

    [Fact]
    public async Task Publish_requires_approval_and_passes_exact_bundle_to_atomic_repository()
    {
        var v = Version();
        (await _service.PublishAsync(v.Id, new() { Revision = 4, Reason = "Release" }, _actor)).Error!.Kind.ShouldBe(ServiceErrorKind.Conflict);
        v.Status = ContentStatus.Approved;
        (await _service.PublishAsync(v.Id, new() { Revision = 4, Reason = "Release" }, _actor)).Error!.Code.ShouldBe("CONTENT_VERSION_NOT_REVIEWED");
        v.ReviewedById = _actor; v.ReviewedAt = TestHelpers.Now;
        var bundle = v.Bundle;
        (await _service.PublishAsync(v.Id, new() { Revision = 4, Reason = " Release " }, _actor)).Error.ShouldBeNull();
        await _repo.Received(1).PublishAsync(v, _actor, "Release", TestHelpers.Now, Arg.Any<CancellationToken>());
        v.Bundle.ShouldBe(bundle);
    }

    [Fact]
    public async Task Concurrent_review_or_publication_returns_conflict()
    {
        var v = Version();
        _repo.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns<int>(_ => throw new DbUpdateConcurrencyException());
        (await _service.ApproveAsync(v.Id, new() { Revision = 4 }, _actor)).Error!.Kind.ShouldBe(ServiceErrorKind.Conflict);
        _repo.PublishAsync(v, _actor, "Release", Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw new DbUpdateConcurrencyException());
        (await _service.PublishAsync(v.Id, new() { Revision = 5, Reason = "Release" }, _actor)).Error!.Kind.ShouldBe(ServiceErrorKind.Conflict);
    }

    [Fact]
    public async Task Missing_versions_and_invalid_history_pagination_return_errors()
    {
        (await _service.ApproveAsync(Guid.NewGuid(), new() { Revision = 0 }, _actor)).Error!.Kind.ShouldBe(ServiceErrorKind.NotFound);
        (await _service.RejectAsync(Guid.NewGuid(), new() { Revision = 0, ReviewNote = "No" }, _actor)).Error!.Kind.ShouldBe(ServiceErrorKind.NotFound);
        (await _service.PublishAsync(Guid.NewGuid(), new() { Revision = 0, Reason = "Release" }, _actor)).Error!.Kind.ShouldBe(ServiceErrorKind.NotFound);
        (await _service.SearchPublicationsAsync(new() { PageSize = 101 })).Error!.Kind.ShouldBe(ServiceErrorKind.Validation);
    }

    [Fact]
    public async Task History_returns_actor_reason_and_previous_version()
    {
        var id = Guid.NewGuid();
        var row = new ContentPublicationHistory { ContentVersionId = id, PreviousVersionId = Guid.NewGuid(),
            ActorId = _actor, Reason = "Balance", Action = PublishAction.Publish };
        _repo.SearchPublicationsAsync(id, 1, 20, Arg.Any<CancellationToken>()).Returns((new List<ContentPublicationHistory> { row }, 1));
        var result = (await _service.SearchPublicationsAsync(new() { ContentVersionId = id })).Data!;
        result.TotalCount.ShouldBe(1);
        result.Items.Single().PreviousVersionId.ShouldBe(row.PreviousVersionId);
        result.Items.Single().ActorId.ShouldBe(_actor);
    }
}
