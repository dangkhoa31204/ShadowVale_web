using System.Globalization;
using System.Text;

namespace ShadowVale.BLL.Services;

// One CSV column. Text = free text from players or designers, which gets the formula-injection guard;
// numbers, dates and ids never do (a leading '-' there is just a negative number).
public sealed record CsvColumn<T>(string Header, Func<T, object?> Value, bool Text = false);

// RFC 4180 CSV, UTF-8 with BOM (so Excel picks the right encoding), invariant culture, times in UTC ISO 8601
public static class CsvWriter
{
    private static readonly char[] FormulaStarts = ['=', '+', '-', '@', '\t', '\r'];

    public static async Task WriteAsync<T>(Stream stream, IReadOnlyList<CsvColumn<T>> columns, IAsyncEnumerable<T> rows, CancellationToken ct)
    {
        await stream.WriteAsync(Encoding.UTF8.Preamble.ToArray(), ct);
        await using var writer = new StreamWriter(stream, new UTF8Encoding(false), bufferSize: 64 * 1024, leaveOpen: true)
        {
            NewLine = "\r\n"
        };

        await writer.WriteLineAsync(string.Join(',', columns.Select(c => Escape(c.Header))));
        await foreach (var row in rows.WithCancellation(ct))
            await writer.WriteLineAsync(string.Join(',', columns.Select(c => Format(c.Value(row), c.Text))));
        await writer.FlushAsync(ct);
    }

    public static string Format(object? value, bool text)
    {
        var raw = value switch
        {
            null => "",
            string s => s,
            DateTime d => DateTime.SpecifyKind(d, DateTimeKind.Utc).ToString("yyyy-MM-ddTHH:mm:ss.FFFFFFFZ", CultureInfo.InvariantCulture),
            bool b => b ? "true" : "false",
            IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
            _ => value.ToString() ?? ""
        };

        if (text && raw.Length > 0 && FormulaStarts.Contains(raw[0]))
            raw = "'" + raw;
        return Escape(raw);
    }

    private static string Escape(string value) =>
        value.IndexOfAny([',', '"', '\r', '\n']) >= 0 ? $"\"{value.Replace("\"", "\"\"")}\"" : value;
}
