using NSubstitute;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Services.Content;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class ContentVersionServiceTests
{
    private readonly IContentRepository _content = Substitute.For<IContentRepository>();
    private readonly ContentVersionService _sut;
    private readonly User _author = TestHelpers.User();
    private readonly Guid _admin = Guid.NewGuid();

    public ContentVersionServiceTests()
    {
        _sut = new ContentVersionService(_content, new ContentEditor(_content), TestHelpers.FixedTime());
        // Run the work passed to the transaction, like the real repository does
        _content.ExecuteInTransactionAsync(Arg.Any<Func<Task>>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Func<Task>>()());
        _content.GetCountsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(new ContentCounts(0, 0, 0, 0, 0, 0, 0));
    }

    private ContentVersion Version(ContentStatus status, long no = 1) => new()
    {
        VersionNo = no, Label = $"v{no}", Status = status, AuthoredBy = _author, AuthoredById = _author.Id
    };

    private void Existing(ContentVersion version, bool valid = true)
    {
        _content.GetVersionAsync(version.Id, Arg.Any<CancellationToken>()).Returns(version);
        var ammo = new Item { Code = "ammo", Name = "Ammo", Type = ItemType.Ammo };
        var map = new Map { Code = "camp", Name = "Camp", SceneKey = "Camp", IsSafeCamp = valid };
        _content.LoadSnapshotAsync(version.Id, Arg.Any<CancellationToken>())
            .Returns(new ContentSnapshot(version, [ammo], [], [], [], [map], [], []));
    }

    [Fact]
    public async Task Publish_ArchivesCurrentVersionAndLogsIt()
    {
        var current = Version(ContentStatus.Published, 1);
        var next = Version(ContentStatus.Approved, 2);
        Existing(next);
        _content.GetPublishedVersionAsync(Arg.Any<CancellationToken>()).Returns(current);

        var result = await _sut.PublishAsync(next.Id, _admin, new PublishContentVersionRequest { Reason = "Balance pass" });

        result.Status.ShouldBe("Published");
        current.Status.ShouldBe(ContentStatus.Archived);
        current.ArchivedAt.ShouldBe(TestHelpers.Now);
        next.Status.ShouldBe(ContentStatus.Published);
        next.PublishedAt.ShouldBe(TestHelpers.Now);
        next.PublishedById.ShouldBe(_admin);
        next.Bundle.ShouldNotBeNull();
        next.BundleChecksum!.Length.ShouldBe(64);
        _content.Received(1).AddHistory(Arg.Is<ContentPublicationHistory>(h =>
            h.Action == PublishAction.Publish && h.ContentVersionId == next.Id && h.PreviousVersionId == current.Id && h.Reason == "Balance pass"));
    }

    [Theory]
    [InlineData(ContentStatus.Draft)]
    [InlineData(ContentStatus.InReview)]
    [InlineData(ContentStatus.Published)]
    [InlineData(ContentStatus.Archived)]
    public async Task Publish_OnlyFromApproved(ContentStatus status)
    {
        var version = Version(status);
        Existing(version);

        await Should.ThrowAsync<ConflictException>(() => _sut.PublishAsync(version.Id, _admin, new PublishContentVersionRequest()));

        _content.DidNotReceive().AddHistory(Arg.Any<ContentPublicationHistory>());
    }

    [Fact]
    public async Task Publish_ContentThatNoLongerValidates_IsRefused()
    {
        var version = Version(ContentStatus.Approved);
        Existing(version, valid: false);

        var ex = await Should.ThrowAsync<ValidationException>(() => _sut.PublishAsync(version.Id, _admin, new PublishContentVersionRequest()));

        ex.Errors.ShouldContainKey("maps");
        version.Status.ShouldBe(ContentStatus.Approved);
    }

    [Fact]
    public async Task Submit_ValidContent_MovesToInReviewWithStoredBundle()
    {
        var version = Version(ContentStatus.Draft);
        Existing(version);

        var result = await _sut.SubmitAsync(version.Id);

        result.Status.ShouldBe("InReview");
        result.IsValidated.ShouldBeTrue();
        version.SubmittedAt.ShouldBe(TestHelpers.Now);
        version.Bundle.ShouldNotBeNull();
    }

    [Fact]
    public async Task Submit_InvalidContent_StaysDraftAndKeepsTheProblems()
    {
        var version = Version(ContentStatus.Draft);
        Existing(version, valid: false);

        var ex = await Should.ThrowAsync<ValidationException>(() => _sut.SubmitAsync(version.Id));

        ex.Errors.ShouldContainKey("maps");
        version.Status.ShouldBe(ContentStatus.Draft);
        version.Bundle.ShouldBeNull();
        version.ValidationErrors.ShouldNotBeNull();
        await _content.Received().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Submit_RejectedVersion_IsAllowedAgain()
    {
        var version = Version(ContentStatus.Rejected);
        Existing(version);

        (await _sut.SubmitAsync(version.Id)).Status.ShouldBe("InReview");
    }

    [Fact]
    public async Task Approve_RecordsReviewerAndNote()
    {
        var version = Version(ContentStatus.InReview);
        Existing(version);

        var result = await _sut.ApproveAsync(version.Id, _admin, new ReviewNoteRequest { Note = "  ok  " });

        result.Status.ShouldBe("Approved");
        version.ReviewedById.ShouldBe(_admin);
        version.ReviewNote.ShouldBe("ok");
    }

    [Fact]
    public async Task Reject_SetsRejectedWithNote_AndCannotRunTwice()
    {
        var version = Version(ContentStatus.InReview);
        Existing(version);

        (await _sut.RejectAsync(version.Id, _admin, new RejectContentVersionRequest { Note = "Boss HP too low" })).Status.ShouldBe("Rejected");
        await Should.ThrowAsync<ConflictException>(() => _sut.RejectAsync(version.Id, _admin, new RejectContentVersionRequest { Note = "again" }));
    }

    [Fact]
    public async Task Rollback_RepublishesArchivedVersionWithItsStoredBundle()
    {
        var current = Version(ContentStatus.Published, 2);
        var old = Version(ContentStatus.Archived, 1);
        old.Bundle = """{"old":true}""";
        old.BundleChecksum = new string('a', 64);
        Existing(old);
        _content.GetPublishedVersionAsync(Arg.Any<CancellationToken>()).Returns(current);

        await _sut.RollbackAsync(old.Id, _admin, new RollbackContentVersionRequest { Reason = "Crash on map 2" });

        old.Status.ShouldBe(ContentStatus.Published);
        old.Bundle.ShouldBe("""{"old":true}""");
        current.Status.ShouldBe(ContentStatus.Archived);
        _content.Received(1).AddHistory(Arg.Is<ContentPublicationHistory>(h => h.Action == PublishAction.Rollback && h.PreviousVersionId == current.Id));
    }

    [Fact]
    public async Task Rollback_OnlyToArchivedVersion()
    {
        var version = Version(ContentStatus.Approved);
        Existing(version);

        await Should.ThrowAsync<ConflictException>(() => _sut.RollbackAsync(version.Id, _admin, new RollbackContentVersionRequest { Reason = "x" }));
    }

    [Fact]
    public async Task Delete_OnlyDraftOrRejected()
    {
        var published = Version(ContentStatus.Published);
        Existing(published);
        await Should.ThrowAsync<ConflictException>(() => _sut.DeleteAsync(published.Id));

        var draft = Version(ContentStatus.Draft);
        Existing(draft);
        await _sut.DeleteAsync(draft.Id);
        _content.Received(1).Remove(draft);
    }

    [Fact]
    public async Task Create_FromUnknownBase_Returns400()
    {
        _content.LoadSnapshotAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((ContentSnapshot?)null);

        var ex = await Should.ThrowAsync<ValidationException>(() =>
            _sut.CreateAsync(new CreateContentVersionRequest { Label = "v2", BaseVersionId = Guid.NewGuid() }, _admin));

        ex.Errors.ShouldContainKey("BaseVersionId");
    }

    [Fact]
    public async Task Create_FromBase_CopiesRowsWithNewIdsAndKeepsReferences()
    {
        var ammo = new Item { Code = "ammo", Name = "Ammo", Type = ItemType.Ammo };
        var rifle = new Item
        {
            Code = "rifle", Name = "Rifle", Type = ItemType.Weapon,
            Weapon = new Weapon { Class = WeaponClass.Rifle, Damage = 10, FireRate = 1, AmmoItemId = ammo.Id, MagazineSize = 10, ReloadTimeSeconds = 1, MaxDurability = 10 }
        };
        var baseVersion = Version(ContentStatus.Published);
        _content.LoadSnapshotAsync(baseVersion.Id, Arg.Any<CancellationToken>())
            .Returns(new ContentSnapshot(baseVersion, [ammo, rifle], [], [], [], [], [], []));
        var added = new List<object>();
        _content.When(c => c.Add(Arg.Any<ContentVersion>())).Do(call => added.Add(call.Arg<ContentVersion>()));
        _content.When(c => c.Add(Arg.Any<Item>())).Do(call => added.Add(call.Arg<Item>()));
        _content.GetVersionAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(call =>
            added.OfType<ContentVersion>().Select(v => { v.AuthoredBy = _author; return v; }).First());

        await _sut.CreateAsync(new CreateContentVersionRequest { Label = "v2", BaseVersionId = baseVersion.Id }, _author.Id);

        var newVersion = added.OfType<ContentVersion>().Single();
        newVersion.ParentVersionId.ShouldBe(baseVersion.Id);
        var copies = added.OfType<Item>().ToList();
        copies.Count.ShouldBe(2);
        copies.ShouldAllBe(i => i.ContentVersionId == newVersion.Id);
        copies.Select(i => i.Id).ShouldNotContain(ammo.Id);
        var copiedAmmo = copies.Single(i => i.Code == "ammo");
        var copiedRifle = copies.Single(i => i.Code == "rifle");
        copiedRifle.Weapon!.AmmoItemId.ShouldBe(copiedAmmo.Id);
        copiedRifle.Weapon.Id.ShouldNotBe(rifle.Weapon!.Id);
    }
}

public class ContentEditorTests
{
    private readonly IContentRepository _content = Substitute.For<IContentRepository>();

    [Fact]
    public async Task OpenForEdit_DraftMovesRevisionAndClearsValidation()
    {
        var version = new ContentVersion { Status = ContentStatus.Draft, Revision = 4, Bundle = "{}", BundleChecksum = "x", ValidatedAt = TestHelpers.Now };
        _content.GetVersionAsync(version.Id, Arg.Any<CancellationToken>()).Returns(version);

        await new ContentEditor(_content).OpenForEditAsync(version.Id, CancellationToken.None);

        version.Revision.ShouldBe(5);
        version.Bundle.ShouldBeNull();
        version.BundleChecksum.ShouldBeNull();
        version.ValidatedAt.ShouldBeNull();
    }

    [Fact]
    public async Task OpenForEdit_RejectedGoesBackToDraft()
    {
        var version = new ContentVersion { Status = ContentStatus.Rejected };
        _content.GetVersionAsync(version.Id, Arg.Any<CancellationToken>()).Returns(version);

        await new ContentEditor(_content).OpenForEditAsync(version.Id, CancellationToken.None);

        version.Status.ShouldBe(ContentStatus.Draft);
    }

    [Theory]
    [InlineData(ContentStatus.InReview)]
    [InlineData(ContentStatus.Approved)]
    [InlineData(ContentStatus.Published)]
    [InlineData(ContentStatus.Archived)]
    public async Task OpenForEdit_FrozenVersionIsAConflict(ContentStatus status)
    {
        var version = new ContentVersion { Status = status, Revision = 2 };
        _content.GetVersionAsync(version.Id, Arg.Any<CancellationToken>()).Returns(version);

        await Should.ThrowAsync<ConflictException>(() => new ContentEditor(_content).OpenForEditAsync(version.Id, CancellationToken.None));

        version.Revision.ShouldBe(2);
    }

    [Fact]
    public async Task OpenForEdit_UnknownVersion_IsNotFound()
    {
        _content.GetVersionAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((ContentVersion?)null);

        await Should.ThrowAsync<NotFoundException>(() => new ContentEditor(_content).OpenForEditAsync(Guid.NewGuid(), CancellationToken.None));
    }

    [Fact]
    public void ConcurrencyConflict_BecomesA409()
    {
        DatabaseErrors.Map(new Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException()).ShouldBeOfType<ConflictException>();
    }

    [Fact]
    public void EnsureUnreferenced_ListsWhatStillUsesTheRow()
    {
        var ex = Should.Throw<ConflictException>(() =>
            ContentEditor.EnsureUnreferenced(["loot table 'loot_1'", "recipe 'r_1' (as ingredient)"], "Item", "scrap"));

        ex.Message.ShouldContain("loot table 'loot_1'");
        ex.Message.ShouldContain("scrap");
    }
}
