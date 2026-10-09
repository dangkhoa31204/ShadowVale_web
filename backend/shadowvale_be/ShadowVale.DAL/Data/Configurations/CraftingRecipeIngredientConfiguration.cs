using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class CraftingRecipeIngredientConfiguration : IEntityTypeConfiguration<CraftingRecipeIngredient>
{
    public void Configure(EntityTypeBuilder<CraftingRecipeIngredient> builder)
    {
        builder.HasIndex(i => new { i.RecipeId, i.ItemId }).IsUnique();

        builder.HasOne(i => i.Recipe).WithMany(r => r.Ingredients).HasForeignKey(i => i.RecipeId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(i => i.Item).WithMany().HasForeignKey(i => i.ItemId).OnDelete(DeleteBehavior.Cascade);

        builder.ToTable(t => t.HasCheckConstraint("ck_crafting_recipe_ingredients_quantity", "quantity > 0"));
    }
}
