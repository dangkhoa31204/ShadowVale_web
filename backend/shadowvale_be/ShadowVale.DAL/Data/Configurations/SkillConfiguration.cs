using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ShadowVale.DAL.Entities;

namespace ShadowVale.DAL.Data.Configurations;

public class SkillConfiguration : ContentEntityConfiguration<Skill>
{
    protected override Expression<Func<ContentVersion, IEnumerable<Skill>?>> VersionCollection => v => v.Skills;

    protected override void ConfigureContent(EntityTypeBuilder<Skill> builder)
    {
        builder.Property(s => s.Name).HasMaxLength(100);
        builder.Property(s => s.Type).IsEnumText();
        builder.Property(s => s.XpCurve).IsJsonb();
        builder.Property(s => s.Effects).IsJsonb();

        builder.ToTable(t => t.HasCheckConstraint("ck_skills_max_level", "max_level > 0"));
    }
}
