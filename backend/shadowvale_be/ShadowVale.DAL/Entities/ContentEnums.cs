namespace ShadowVale.DAL.Entities;

// All enums are stored as text (like UserRole), so the column reads "Weapon" instead of 0.
// Adding a member needs no migration; renaming one changes stored data.

// Lifecycle of a content version: Draft -> InReview -> Approved -> Published -> Archived (Rejected goes back to Draft)
public enum ContentStatus
{
    Draft,
    InReview,
    Rejected,
    Approved,
    Published,
    Archived
}

public enum PublishAction
{
    Publish,
    Rollback
}

// What an item is. Weapon and Consumable items also have a row in weapons / consumables.
public enum ItemType
{
    Weapon,
    Ammo,
    Consumable,
    Material,
    Tool,
    Armor,
    QuestItem
}

public enum ItemRarity
{
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary
}

public enum WeaponClass
{
    Pistol,
    Smg,
    Rifle,
    Shotgun,
    Sniper,
    Melee
}

public enum SkillType
{
    Shooting,
    Engineering,
    Stealth
}
