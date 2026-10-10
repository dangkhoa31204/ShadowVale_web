using ShadowVale.BLL.DTOs.Content;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Interfaces;
using ShadowVale.BLL.Mappings;
using ShadowVale.DAL.Entities;
using ShadowVale.DAL.Repositories.Interfaces;

namespace ShadowVale.BLL.Services.Content;

// Items, with the weapon / consumable stats that belong to them. An item's type is fixed once created,
// because the stats rows (and enemies using the weapon) depend on it.
public class ItemService(IContentRepository content, ContentEditor editor) : IItemService
{
    public async Task<IReadOnlyList<ItemDto>> GetAllAsync(Guid versionId, ItemQuery query, CancellationToken ct = default)
    {
        await editor.EnsureVersionExistsAsync(versionId, ct);
        var type = EnumParsing.ParseOptional<ItemType>(query.Type, nameof(query.Type));
        var rarity = EnumParsing.ParseOptional<ItemRarity>(query.Rarity, nameof(query.Rarity));
        var search = query.Search?.Trim();

        var items = await content.ListAsync<Item>(versionId, ct);
        var codes = items.ToDictionary(i => i.Id, i => i.Code);
        return items
            .Where(i => (type is null || i.Type == type) && (rarity is null || i.Rarity == rarity))
            .Where(i => string.IsNullOrEmpty(search)
                || i.Code.Contains(search, StringComparison.OrdinalIgnoreCase)
                || i.Name.Contains(search, StringComparison.OrdinalIgnoreCase))
            .Select(i => ToDto(i, codes))
            .ToList();
    }

    public async Task<ItemDto> GetByIdAsync(Guid versionId, Guid id, CancellationToken ct = default) =>
        ToDto(await FindAsync(versionId, id, ct), await content.CodesAsync<Item>(versionId, ct));

    public async Task<ItemDto> CreateAsync(Guid versionId, CreateItemRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var existing = await content.ListAsync<Item>(versionId, ct);
        ContentEditor.EnsureCodeFree(existing.Select(i => i.Code), request.Code, "Item");

        var item = new Item { ContentVersionId = versionId, Code = request.Code };
        Apply(item, request, existing, isNew: true);
        content.Add(item);

        await editor.SaveAsync(ct);
        return ToDto(item, existing.ToDictionary(i => i.Id, i => i.Code).With(item.Id, item.Code));
    }

    public async Task<ItemDto> UpdateAsync(Guid versionId, Guid id, SaveItemRequest request, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var item = await FindAsync(versionId, id, ct);
        var all = await content.ListAsync<Item>(versionId, ct);

        Apply(item, request, all, isNew: false);

        await editor.SaveAsync(ct);
        return ToDto(item, all.ToDictionary(i => i.Id, i => i.Code));
    }

    public async Task DeleteAsync(Guid versionId, Guid id, CancellationToken ct = default)
    {
        await editor.OpenForEditAsync(versionId, ct);
        var item = await FindAsync(versionId, id, ct);
        ContentEditor.EnsureUnreferenced(await content.ReferencesToItemAsync(id, ct), "Item", item.Code);

        content.Remove(item);
        await editor.SaveAsync(ct);
    }

    private void Apply(Item item, SaveItemRequest request, List<Item> versionItems, bool isNew)
    {
        var type = EnumParsing.Parse<ItemType>(request.Type, nameof(request.Type));
        if (!isNew && type != item.Type)
            throw new ValidationException(nameof(request.Type), $"The type of an item cannot change (it is {item.Type}). Delete it and create a new one.");
        if (type == ItemType.Weapon && request.MaxStack != 1)
            throw new ValidationException(nameof(request.MaxStack), "A weapon is not stackable: MaxStack must be 1.");
        if (type != ItemType.Weapon && request.Weapon is not null)
            throw new ValidationException(nameof(request.Weapon), "Only an item of type Weapon has weapon stats.");
        if (type == ItemType.Weapon && request.Weapon is null)
            throw new ValidationException(nameof(request.Weapon), "An item of type Weapon needs weapon stats.");
        if (type != ItemType.Consumable && request.Consumable is not null)
            throw new ValidationException(nameof(request.Consumable), "Only an item of type Consumable has consumable stats.");
        if (type == ItemType.Consumable && request.Consumable is null)
            throw new ValidationException(nameof(request.Consumable), "An item of type Consumable needs consumable stats.");

        item.Name = request.Name.Trim();
        item.Description = request.Description?.Trim();
        item.Type = type;
        item.Rarity = string.IsNullOrWhiteSpace(request.Rarity) ? ItemRarity.Common : EnumParsing.Parse<ItemRarity>(request.Rarity, nameof(request.Rarity));
        item.MaxStack = request.MaxStack;
        item.Weight = request.Weight;
        item.BaseValue = request.BaseValue;
        item.Stats = ContentJson.Object(request.Stats, nameof(request.Stats));
        item.IconKey = request.IconKey?.Trim();

        if (request.Weapon is { } w)
            ApplyWeapon(item, w, versionItems);
        if (request.Consumable is { } c)
            ApplyConsumable(item, c);
    }

    private static void ApplyWeapon(Item item, WeaponRequest request, List<Item> versionItems)
    {
        var weaponClass = EnumParsing.Parse<WeaponClass>(request.Class, "Weapon.Class");
        Guid? ammoId = null;

        if (weaponClass == WeaponClass.Melee)
        {
            if (request.AmmoItemCode is not null || request.MagazineSize is not null || request.ReloadTimeSeconds is not null)
                throw new ValidationException("Weapon", "A melee weapon has no ammo, magazine or reload time.");
        }
        else
        {
            if (request.MagazineSize is null || request.ReloadTimeSeconds is null)
                throw new ValidationException("Weapon", "A ranged weapon needs MagazineSize and ReloadTimeSeconds.");
            var ammo = versionItems.FirstOrDefault(i => i.Code == request.AmmoItemCode);
            if (ammo is null || ammo.Type != ItemType.Ammo)
                throw new ValidationException("Weapon.AmmoItemCode", $"'{request.AmmoItemCode}' is not an item of type Ammo in this content version.");
            ammoId = ammo.Id;
        }

        var weapon = item.Weapon ??= new Weapon();
        weapon.Class = weaponClass;
        weapon.Damage = request.Damage;
        weapon.FireRate = request.FireRate;
        weapon.EffectiveRange = request.EffectiveRange;
        weapon.MagazineSize = request.MagazineSize;
        weapon.ReloadTimeSeconds = request.ReloadTimeSeconds;
        weapon.AmmoItemId = ammoId;
        weapon.MaxDurability = request.MaxDurability;
        weapon.DurabilityPerUse = request.DurabilityPerUse;
        weapon.NoiseRadius = request.NoiseRadius;
        weapon.IsSuppressed = request.IsSuppressed;
    }

    private static void ApplyConsumable(Item item, ConsumableRequest request)
    {
        var consumable = item.Consumable ??= new Consumable();
        consumable.HealHp = request.HealHp;
        consumable.RestoreStamina = request.RestoreStamina;
        consumable.UseTimeSeconds = request.UseTimeSeconds;
        consumable.Cures = request.Cures?.Select(c => c.Trim()).Where(c => c.Length > 0).Distinct().ToList() ?? [];
        consumable.ExtraEffects = ContentJson.Object(request.ExtraEffects, "Consumable.ExtraEffects");
    }

    private async Task<Item> FindAsync(Guid versionId, Guid id, CancellationToken ct) =>
        await content.FindAsync<Item>(versionId, id, ct) ?? throw new NotFoundException("Item", id);

    internal static ItemDto ToDto(Item i, Dictionary<Guid, string> itemCodes) => new(
        i.Id, i.Code, i.Name, i.Description, i.Type.ToString(), i.Rarity.ToString(), i.MaxStack, i.Weight, i.BaseValue,
        ContentJson.ToElement(i.Stats), i.IconKey,
        i.Weapon is null ? null : new WeaponDto(
            i.Weapon.Class.ToString(), i.Weapon.Damage, i.Weapon.FireRate, i.Weapon.EffectiveRange, i.Weapon.MagazineSize,
            i.Weapon.ReloadTimeSeconds, ContentReferences.CodeOf(itemCodes, i.Weapon.AmmoItemId), i.Weapon.MaxDurability,
            i.Weapon.DurabilityPerUse, i.Weapon.NoiseRadius, i.Weapon.IsSuppressed),
        i.Consumable is null ? null : new ConsumableDto(
            i.Consumable.HealHp, i.Consumable.RestoreStamina, i.Consumable.UseTimeSeconds, i.Consumable.Cures,
            ContentJson.ToElement(i.Consumable.ExtraEffects)),
        i.UpdatedAt);
}

internal static class DictionaryExtensions
{
    public static Dictionary<TKey, TValue> With<TKey, TValue>(this Dictionary<TKey, TValue> source, TKey key, TValue value) where TKey : notnull
    {
        source[key] = value;
        return source;
    }
}
