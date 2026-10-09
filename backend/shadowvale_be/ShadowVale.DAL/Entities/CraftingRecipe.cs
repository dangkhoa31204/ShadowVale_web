namespace ShadowVale.DAL.Entities;

public class CraftingRecipe : ContentEntity
{
    public string Name { get; set; } = null!;

    public Guid OutputItemId { get; set; }
    public Item OutputItem { get; set; } = null!;
    public int OutputQuantity { get; set; } = 1;

    public decimal CraftTimeSeconds { get; set; }

    // Null = no skill needed
    public Guid? RequiredSkillId { get; set; }
    public Skill? RequiredSkill { get; set; }
    public int RequiredSkillLevel { get; set; }

    // workbench (Safe Camp) / field...
    public string Station { get; set; } = "workbench";

    public ICollection<CraftingRecipeIngredient> Ingredients { get; set; } = [];
}
