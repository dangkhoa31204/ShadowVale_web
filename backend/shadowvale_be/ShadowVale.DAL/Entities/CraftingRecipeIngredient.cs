namespace ShadowVale.DAL.Entities;

// Any item can be an ingredient (usually Material)
public class CraftingRecipeIngredient : BaseEntity
{
    public Guid RecipeId { get; set; }
    public CraftingRecipe Recipe { get; set; } = null!;

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public int Quantity { get; set; }
}
