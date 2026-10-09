using ShadowVale.BLL.Exceptions;

namespace ShadowVale.BLL.Mappings;

public static class EnumParsing
{
    // Exact member names only (case-insensitive): Enum.TryParse alone would also accept "1" or "Admin, Analyst"
    public static bool TryParse<TEnum>(string? value, out TEnum result) where TEnum : struct, Enum
    {
        if (value is not null)
        {
            var trimmed = value.Trim();
            foreach (var member in Enum.GetValues<TEnum>())
            {
                if (string.Equals(member.ToString(), trimmed, StringComparison.OrdinalIgnoreCase))
                {
                    result = member;
                    return true;
                }
            }
        }

        result = default;
        return false;
    }

    public static TEnum Parse<TEnum>(string? value, string field) where TEnum : struct, Enum =>
        TryParse<TEnum>(value, out var result)
            ? result
            : throw new ValidationException(field, $"{field} must be one of: {string.Join(", ", Enum.GetNames<TEnum>())}.");

    // Null or blank means "no filter"
    public static TEnum? ParseOptional<TEnum>(string? value, string field) where TEnum : struct, Enum =>
        string.IsNullOrWhiteSpace(value) ? null : Parse<TEnum>(value, field);
}
