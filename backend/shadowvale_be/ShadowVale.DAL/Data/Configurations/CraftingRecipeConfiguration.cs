using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class CraftingRecipeConfiguration : ContentEntityConfiguration<CraftingRecipe>
{
    protected override Expression<Func<ContentVersion, IEnumerable<CraftingRecipe>?>> VersionCollection => v => v.CraftingRecipes;

    protected override void ConfigureContent(EntityTypeBuilder<CraftingRecipe> builder)
    {
        builder.Property(r => r.Name).HasMaxLength(100);
        builder.Property(r => r.CraftTimeSeconds).HasPrecision(6, 2);
        builder.Property(r => r.Station).HasMaxLength(50);

        builder.HasOne(r => r.OutputItem).WithMany().HasForeignKey(r => r.OutputItemId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(r => r.RequiredSkill).WithMany().HasForeignKey(r => r.RequiredSkillId).OnDelete(DeleteBehavior.SetNull);

        builder.ToTable(t =>
        {
            t.HasCheckConstraint("ck_crafting_recipes_output_quantity", "output_quantity > 0");
            t.HasCheckConstraint("ck_crafting_recipes_craft_time", "craft_time_seconds >= 0");
            t.HasCheckConstraint("ck_crafting_recipes_skill_level", "required_skill_level >= 0");
        });
    }
}
