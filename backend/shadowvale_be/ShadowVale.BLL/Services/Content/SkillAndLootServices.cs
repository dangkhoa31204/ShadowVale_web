using System.Text.Json;
using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Mappings;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services.Content;

public class SkillService(IContentRepository content, ContentEditor editor) : ISkillService
{
    public async Task<IReadOnlyList<SkillDto>> GetAllAsync(Guid versionId, CancellationToken ct = default)
    {
        await editor.EnsureVersionExistsAsync(versionId, ct);
        return (await content.ListAsync<Skill>(versionId, ct)).Select(ToDto).ToList();
    }

    public async Task<SkillDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default) =>
        ToDto(await FindAsync(versionId, id, ct));

    public async Task<SkillDto> CreateAsync(Guid versionId, CreateSkillRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        ContentEditor.EnsureCodeFree((await content.CodesAsync<Skill>(versionId, ct)).Values, request.Code, "Skill");

        var skill = new Skill { ContentVersionId = versionId, Code = request.Code };
        Apply(skill, request);
        content.Add(skill);

        await editor.SaveAsync(ct);
        return ToDto(skill);
    }

    public async Task<SkillDto> UpdateAsync(Guid versionId, Guid id, SaveSkillRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var skill = await FindAsync(versionId, id, ct);
        Apply(skill, request);

        await editor.SaveAsync(ct);
        return ToDto(skill);
    }

    public async Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var skill = await FindAsync(versionId, id, ct);
        ContentEditor.EnsureUnreferenced(await content.ReferencesToSkillAsync(id, ct), "Skill", skill.Code);

        content.Remove(skill);
        await editor.SaveAsync(ct);
    }

    private static void Apply(Skill skill, SaveSkillRequest request)
    {
        var xpCurve = ContentJson.Array(request.XpCurve, nameof(request.XpCurve));
        if (JsonSerializer.Deserialize<JsonElement>(xpCurve).EnumerateArray().Any(x => x.ValueKind != JsonValueKind.Number || x.GetDecimal() < 0))
            throw new ValidationException(nameof(request.XpCurve), "XpCurve must be a list of non-negative numbers.");

        skill.Name = request.Name.Trim();
        skill.Type = EnumParsing.Parse<SkillType>(request.Type, nameof(request.Type));
        skill.MaxLevel = request.MaxLevel;
        skill.XpCurve = xpCurve;
        skill.Effects = ContentJson.Object(request.Effects, nameof(request.Effects));
    }

    private async Task<Skill> FindAsync(Guid versionId, Guid id, CancellationToken ct) =>
        await content.FindAsync<Skill>(versionId, id, ct) ?? throw new NotFoundException("Skill", id);

    private static SkillDto ToDto(Skill s) => new(
        s.Id, s.Code, s.Name, s.Type.ToString(), s.MaxLevel, ContentJson.ToElement(s.XpCurve), ContentJson.ToElement(s.Effects), s.UpdatedAt);
}

public class LootTableService(IContentRepository content, ContentEditor editor) : ILootTableService
{
    public async Task<IReadOnlyList<LootTableDto>> GetAllAsync(Guid versionId, CancellationToken ct = default)
    {
        await editor.EnsureVersionExistsAsync(versionId, ct);
        var codes = await content.CodesAsync<Item>(versionId, ct);
        return (await content.ListAsync<LootTable>(versionId, ct)).Select(l => ToDto(l, codes)).ToList();
    }

    public async Task<LootTableDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default) =>
        ToDto(await FindAsync(versionId, id, ct), await content.CodesAsync<Item>(versionId, ct));

    public async Task<LootTableDto> CreateAsync(Guid versionId, CreateLootTableRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        ContentEditor.EnsureCodeFree((await content.CodesAsync<LootTable>(versionId, ct)).Values, request.Code, "Loot table");

        var table = new LootTable { ContentVersionId = versionId, Code = request.Code };
        var items = await content.CodesAsync<Item>(versionId, ct);
        content.Add(table);
        Apply(table, request, items);

        await editor.SaveAsync(ct);
        return ToDto(table, items);
    }

    public async Task<LootTableDto> UpdateAsync(Guid versionId, Guid id, SaveLootTableRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var table = await FindAsync(versionId, id, ct);
        var items = await content.CodesAsync<Item>(versionId, ct);
        Apply(table, request, items);

        await editor.SaveAsync(ct);
        return ToDto(table, items);
    }

    public async Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var table = await FindAsync(versionId, id, ct);
        ContentEditor.EnsureUnreferenced(await content.ReferencesToLootTableAsync(id, ct), "Loot table", table.Code);

        content.Remove(table);
        await editor.SaveAsync(ct);
    }

    // The entries are replaced as a whole: the client always sends the full list
    private void Apply(LootTable table, SaveLootTableRequest request, Dictionary<Guid, string> items)
    {
        if (request.RollsMin > request.RollsMax)
            throw new ValidationException(nameof(request.RollsMin), "RollsMin cannot be greater than RollsMax.");
        if (request.Entries.Count == 0)
            throw new ValidationException(nameof(request.Entries), "A loot table needs at least one entry.");

        var rows = new List<LootTableEntry>();
        for (var i = 0; i < request.Entries.Count; i++)
        {
            var e = request.Entries[i];
            if (e.MinQuantity > e.MaxQuantity)
                throw new ValidationException($"Entries[{i}].MinQuantity", "MinQuantity cannot be greater than MaxQuantity.");
            rows.Add(new LootTableEntry
            {
                ItemId = ContentReferences.Require(items, e.ItemCode, $"Entries[{i}].ItemCode"),
                Tier = e.Tier,
                Weight = e.Weight,
                MinQuantity = e.MinQuantity,
                MaxQuantity = e.MaxQuantity
            });
        }

        table.Name = request.Name.Trim();
        table.RollsMin = request.RollsMin;
        table.RollsMax = request.RollsMax;
        // Children are added through the repository: a new row that already has an id would otherwise be treated as existing
        foreach (var old in table.Entries.ToList())
            content.Remove(old);
        foreach (var row in rows)
        {
            row.LootTableId = table.Id;
            content.Add(row);
        }
    }

    private async Task<LootTable> FindAsync(Guid versionId, Guid id, CancellationToken ct) =>
        await content.FindAsync<LootTable>(versionId, id, ct) ?? throw new NotFoundException("Loot table", id);

    private static LootTableDto ToDto(LootTable l, Dictionary<Guid, string> items) => new(
        l.Id, l.Code, l.Name, l.RollsMin, l.RollsMax,
        l.Entries.OrderBy(e => e.Tier).ThenByDescending(e => e.Weight)
            .Select(e => new LootEntryDto(ContentReferences.CodeOf(items, e.ItemId) ?? "", e.Tier, e.Weight, e.MinQuantity, e.MaxQuantity)).ToList(),
        l.UpdatedAt);
}
