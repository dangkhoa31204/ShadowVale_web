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
using ShadowVale.DAL.Data;
using ShadowVale.DAL.Repositories.Interfaces;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class ContentVersionServiceTests
{
    private readonly IContentVersionRepository _versions = Substitute.For<IContentVersionRepository>();
    private readonly IContentBundleValidator _validator = Substitute.For<IContentBundleValidator>();
    private readonly ContentVersionService _service;
    public ContentVersionServiceTests() => _service = new(_versions, _validator, TestHelpers.FixedTime());

    private ContentVersion Draft()
    {
        var version = new ContentVersion { Label = "Draft", VersionNo = 1, Revision = 2,
            Bundle = "{}", BundleChecksum = "old", ValidatedAt = TestHelpers.Now };
        _versions.GetByIdAsync(version.Id, Arg.Any<CancellationToken>()).Returns(version);
        _versions.GetSnapshotAsync(version.Id, Arg.Any<CancellationToken>()).Returns(version);
        return version;
    }

    [Fact]
    public async Task Missing_snapshots_return_not_found_for_detail_compare_and_clone()
    {
        var id = Guid.NewGuid();
        (await _service.GetByIdAsync(id)).Error.ShouldNotBeNull().Code.ShouldBe("CONTENT_VERSION_NOT_FOUND");
        (await _service.CompareAsync(id, Guid.NewGuid())).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.NotFound);
        var source = Draft();
        (await _service.CompareAsync(source.Id, id)).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.NotFound);
        (await _service.CreateAsync(new() { Label = "Clone", ParentVersionId = id }, Guid.NewGuid()))
            .Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.NotFound);
        await _versions.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Compare_empty_target_returns_field_error_before_reading_database()
    {
        var result = await _service.CompareAsync(Guid.NewGuid(), Guid.Empty);
        result.Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Validation);
        result.Error.Errors.ShouldNotBeNull().ShouldContainKey("targetId");
        await _versions.DidNotReceive().GetSnapshotAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Compare_same_version_has_no_differences_and_reads_one_snapshot()
    {
        var source = Draft();
        var result = await _service.CompareAsync(source.Id, source.Id);
        result.Error.ShouldBeNull();
        result.Data.ShouldNotBeNull().Differences.ShouldBeEmpty();
        await _versions.Received(1).GetSnapshotAsync(source.Id, Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(" ", "1.0", "Label")]
    [InlineData("Draft", "2.0", "SchemaVersion")]
    public async Task Invalid_metadata_returns_field_errors_without_writing(string label, string schema, string field)
    {
        var result = await _service.CreateAsync(new() { Label = label, SchemaVersion = schema }, Guid.NewGuid());
        result.Error.ShouldNotBeNull().Code.ShouldBe("VALIDATION_FAILED");
        result.Error.Errors.ShouldNotBeNull().ShouldContainKey(field);
        await _versions.DidNotReceive().AddAsync(Arg.Any<ContentVersion>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Stale_revision_returns_specific_code()
    {
        var version = Draft();
        var result = await _service.DeleteAsync(version.Id, new() { Revision = 1 });
        result.Error.ShouldNotBeNull().Code.ShouldBe("CONTENT_VERSION_CHANGED");
        result.Data.ShouldBeFalse();
    }

    [Fact]
    public async Task Delete_archives_draft_without_removing_content_or_bundle()
    {
        var version = Draft();
        version.Items.Add(new Item { ContentVersionId = version.Id, Code = "ammo", Name = "Ammo" });
        await _service.DeleteAsync(version.Id, new DeleteContentVersionRequest { Revision = 2 });
        version.Status.ShouldBe(ContentStatus.Archived);
        version.ArchivedAt.ShouldBe(TestHelpers.Now);
        version.Revision.ShouldBe(3);
        version.Items.Count.ShouldBe(1);
        version.Bundle.ShouldBe("{}");
        await _versions.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        _versions.DidNotReceive().Remove(Arg.Any<ContentVersion>());
    }

    [Theory]
    [InlineData(ContentStatus.InReview)]
    [InlineData(ContentStatus.Approved)]
    [InlineData(ContentStatus.Published)]
    [InlineData(ContentStatus.Archived)]
    [InlineData(ContentStatus.Rejected)]
    public async Task Delete_rejects_non_drafts(ContentStatus status)
    {
        var version = Draft(); version.Status = status;
        (await _service.DeleteAsync(version.Id,
            new DeleteContentVersionRequest { Revision = 2 })).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Conflict);
        version.ArchivedAt.ShouldBeNull();
        await _versions.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Delete_rejects_missing_stale_and_negative_revisions()
    {
        var version = Draft();
        (await _service.DeleteAsync(version.Id, new())).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Validation);
        (await _service.DeleteAsync(version.Id, new() { Revision = -1 })).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Validation);
        (await _service.DeleteAsync(version.Id, new() { Revision = 1 })).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Conflict);
        version.Status.ShouldBe(ContentStatus.Draft);
        await _versions.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Delete_handles_missing_version_and_concurrent_write()
    {
        (await _service.DeleteAsync(Guid.NewGuid(), new() { Revision = 0 })).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.NotFound);
        var version = Draft();
        _versions.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns<int>(_ => throw new DbUpdateConcurrencyException());
        (await _service.DeleteAsync(version.Id, new() { Revision = 2 })).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Conflict);
    }

    [Fact]
    public async Task Update_clears_validation_and_increments_revision()
    {
        var version = Draft();
        var result = (await _service.UpdateAsync(version.Id,
            new UpdateContentVersionRequest { Label = " Updated ", Revision = 2 })).Data!;
        result.Label.ShouldBe("Updated");
        result.Revision.ShouldBe(3);
        version.Bundle.ShouldBeNull();
        version.BundleChecksum.ShouldBeNull();
        version.ValidatedAt.ShouldBeNull();
    }

    [Theory]
    [InlineData(ContentStatus.InReview)]
    [InlineData(ContentStatus.Approved)]
    [InlineData(ContentStatus.Published)]
    [InlineData(ContentStatus.Archived)]
    [InlineData(ContentStatus.Rejected)]
    public async Task Non_drafts_cannot_be_updated_or_validated(ContentStatus status)
    {
        var version = Draft(); version.Status = status;
        (await _service.UpdateAsync(version.Id,
            new UpdateContentVersionRequest { Label = "Changed", Revision = 2 })).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Conflict);
        (await _service.ValidateAsync(version.Id,
            new ValidateContentVersionRequest { Revision = 2 })).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Conflict);
        await _versions.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Stale_and_missing_revisions_do_not_write()
    {
        var version = Draft();
        (await _service.UpdateAsync(version.Id,
            new UpdateContentVersionRequest { Label = "Changed", Revision = 1 })).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Conflict);
        (await _service.ValidateAsync(version.Id,
            new ValidateContentVersionRequest())).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Validation);
        await _versions.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Concurrent_database_update_becomes_conflict()
    {
        var version = Draft();
        _versions.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns<int>(_ => throw new DbUpdateConcurrencyException());
        (await _service.UpdateAsync(version.Id,
            new UpdateContentVersionRequest { Label = "Changed", Revision = 2 })).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Conflict);
    }

    [Fact]
    public async Task Successful_validation_persists_exact_bundle_hash()
    {
        var version = Draft();
        _validator.Validate(Arg.Any<JsonObject>()).Returns(Array.Empty<ContentValidationIssue>());
        var result = (await _service.ValidateAsync(version.Id, new ValidateContentVersionRequest { Revision = 2 })).Data!;
        result.IsValid.ShouldBeTrue(); result.Revision.ShouldBe(3);
        result.ValidatedAt.ShouldBe(TestHelpers.Now);
        result.BundleChecksum.ShouldBe(Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(version.Bundle!))));
        version.ValidationErrors.ShouldBe("[]");
    }

    [Fact]
    public async Task Failed_validation_clears_stale_bundle_and_persists_errors()
    {
        var version = Draft();
        _validator.Validate(Arg.Any<JsonObject>()).Returns(new[] { new ContentValidationIssue("/maps", "Missing camp") });
        var result = (await _service.ValidateAsync(version.Id, new ValidateContentVersionRequest { Revision = 2 })).Data!;
        result.IsValid.ShouldBeFalse();
        version.Bundle.ShouldBeNull(); version.BundleChecksum.ShouldBeNull();
        version.ValidationErrors!.ShouldContain("Missing camp");
    }

    [Fact]
    public async Task Clone_remaps_all_content_ids_and_copies_lists()
    {
        var source = Draft();
        var item = new Item { Code = "medkit", Name = "Medkit", Type = ItemType.Consumable, ContentVersionId = source.Id };
        item.Consumable = new Consumable { ItemId = item.Id, Cures = ["bleeding"] };
        source.Items.Add(item);
        source.LootTables.Add(new LootTable { ContentVersionId = source.Id, Code = "basic", Name = "Basic",
            Entries = [new LootTableEntry { ItemId = item.Id }] });
        var table = source.LootTables.Single(); table.Entries.Single().LootTableId = table.Id;
        BaseEntity[]? copied = null;
        _versions.When(v => v.AddContent(Arg.Any<IEnumerable<BaseEntity>>()))
            .Do(call => copied = call.Arg<IEnumerable<BaseEntity>>().ToArray());
        var created = (await _service.CreateAsync(new CreateContentVersionRequest { Label = "Clone", ParentVersionId = source.Id }, Guid.NewGuid())).Data!;
        copied.ShouldNotBeNull();
        var copy = copied.OfType<Item>().Single();
        copy.Id.ShouldNotBe(item.Id); copy.ContentVersionId.ShouldBe(created.Id);
        copied.OfType<Consumable>().Single().ItemId.ShouldBe(copy.Id);
        copied.OfType<Consumable>().Single().Cures.Add("poison");
        item.Consumable.Cures.ShouldBe(new[] { "bleeding" });
        copied.OfType<LootTableEntry>().Single().LootTableId.ShouldBe(copied.OfType<LootTable>().Single().Id);
        source.Bundle.ShouldBe("{}");
        created.Status.ShouldBe("Draft"); created.Revision.ShouldBe(0);
    }

    [Fact]
    public async Task Clone_rejects_cross_version_references_before_writing()
    {
        var source = Draft();
        source.CraftingRecipes.Add(new CraftingRecipe { ContentVersionId = source.Id, OutputItemId = Guid.NewGuid() });
        (await _service.CreateAsync(
            new CreateContentVersionRequest { Label = "Clone", ParentVersionId = source.Id }, Guid.NewGuid())).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Validation);
        await _versions.DidNotReceive().AddAsync(Arg.Any<ContentVersion>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Clone_tracking_reconstructs_relationships_without_attaching_source()
    {
        using var db = new ShadowValeDbContext(new DbContextOptionsBuilder<ShadowValeDbContext>()
            .UseNpgsql("Host=localhost;Database=tracking_only").UseSnakeCaseNamingConvention().Options);
        var source = Draft();
        var ammo = new Item { Code = "ammo", Name = "Ammo", Type = ItemType.Ammo, ContentVersionId = source.Id };
        var rifle = new Item { Code = "rifle", Name = "Rifle", Type = ItemType.Weapon, ContentVersionId = source.Id };
        rifle.Weapon = new Weapon { ItemId = rifle.Id, AmmoItemId = ammo.Id };
        source.Items = [ammo, rifle];
        _versions.When(v => v.AddAsync(Arg.Any<ContentVersion>(), Arg.Any<CancellationToken>()))
            .Do(call => db.Add(call.Arg<ContentVersion>()));
        _versions.When(v => v.AddContent(Arg.Any<IEnumerable<BaseEntity>>()))
            .Do(call => db.AddRange(call.Arg<IEnumerable<BaseEntity>>()));
        var result = (await _service.CreateAsync(new CreateContentVersionRequest
            { Label = "Clone", ParentVersionId = source.Id }, Guid.NewGuid())).Data!;
        var clone = db.ChangeTracker.Entries<ContentVersion>().Single().Entity;
        clone.Id.ShouldBe(result.Id);
        clone.Items.Count.ShouldBe(2);
        var clonedRifle = clone.Items.Single(i => i.Code == "rifle");
        clonedRifle.Weapon.ShouldNotBeNull();
        clonedRifle.Weapon.AmmoItem.ShouldBeSameAs(clone.Items.Single(i => i.Code == "ammo"));
        db.ChangeTracker.Entries().ShouldAllBe(e => e.State == EntityState.Added);
        db.ChangeTracker.Entries<BaseEntity>().ShouldNotContain(e => e.Entity.Id == source.Id || e.Entity.Id == rifle.Id);
    }

    [Fact]
    public async Task Cross_version_reference_cannot_pass_by_matching_a_code()
    {
        var source = Draft();
        source.CraftingRecipes.Add(new CraftingRecipe { ContentVersionId = source.Id, OutputItemId = Guid.NewGuid() });
        _validator.Validate(Arg.Any<JsonObject>()).Returns(Array.Empty<ContentValidationIssue>());
        var result = (await _service.ValidateAsync(source.Id, new ValidateContentVersionRequest { Revision = 2 })).Data!;
        result.IsValid.ShouldBeFalse();
        source.BundleChecksum.ShouldBeNull();
        result.Errors.ShouldContain(e => e.Message.Contains("another content version"));
    }

    [Fact]
    public async Task Snapshot_revision_change_prevents_validation_write()
    {
        var version = Draft();
        _versions.GetSnapshotAsync(version.Id, Arg.Any<CancellationToken>()).Returns(
            new ContentVersion { Id = version.Id, Revision = version.Revision + 1 });
        (await _service.ValidateAsync(version.Id,
            new ValidateContentVersionRequest { Revision = 2 })).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Conflict);
        await _versions.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("1")]
    [InlineData("Draft, Published")]
    [InlineData("unknown")]
    public async Task Invalid_status_filter_is_rejected(string status) =>
        (await _service.SearchAsync(new ContentVersionQuery { Status = status })).Error.ShouldNotBeNull().Kind.ShouldBe(ServiceErrorKind.Validation);

    [Fact]
    public void Canonical_numbers_ignore_database_decimal_scale()
    {
        ContentVersionService.CanonicalJson(JsonNode.Parse("{\"damage\":30.00,\"weight\":0.0200}"))
            .ShouldBe(ContentVersionService.CanonicalJson(JsonNode.Parse("{\"weight\":0.02,\"damage\":30}")));
        ContentVersionService.CanonicalJson(new JsonObject { ["damage"] = 30.00m })
            .ShouldBe("{\"damage\":30}");
    }

    [Fact]
    public void Canonical_json_is_independent_of_object_key_order() =>
        ContentVersionService.CanonicalJson(JsonNode.Parse("{\"z\":1,\"a\":{\"y\":2,\"x\":3}}"))
            .ShouldBe(ContentVersionService.CanonicalJson(JsonNode.Parse("{\"a\":{\"x\":3,\"y\":2},\"z\":1}")));
}
