using System.Globalization;
using System.Text;
using ShadowVale.BLL.Services;
using Shouldly;

namespace ShadowVale.BLL.Tests.Services;

public class CsvWriterTests
{
    private sealed record Row(string Name, double Value, DateTime At);

    private static readonly CsvColumn<Row>[] Columns =
    [
        new("name", r => r.Name, Text: true),
        new("value", r => r.Value),
        new("at", r => r.At)
    ];

    private static async IAsyncEnumerable<Row> Rows(params Row[] rows)
    {
        foreach (var row in rows)
        {
            await Task.Yield();
            yield return row;
        }
    }

    [Fact]
    public async Task WriteAsync_WritesBomHeaderAndRfc4180Rows()
    {
        using var stream = new MemoryStream();
        var at = new DateTime(2026, 10, 9, 13, 0, 0, DateTimeKind.Utc);

        await CsvWriter.WriteAsync(stream, Columns, Rows(new Row("plain", 1.5, at), new Row("has, \"quotes\"", -2, at)), CancellationToken.None);

        var bytes = stream.ToArray();
        bytes.Take(3).ShouldBe(Encoding.UTF8.Preamble.ToArray());
        Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3).ShouldBe(
            "name,value,at\r\n" +
            "plain,1.5,2026-10-09T13:00:00Z\r\n" +
            "\"has, \"\"quotes\"\"\",-2,2026-10-09T13:00:00Z\r\n");
    }

    [Theory]
    [InlineData("=HYPERLINK(1)", "'=HYPERLINK(1)")]
    [InlineData("+1", "'+1")]
    [InlineData("-cmd", "'-cmd")]
    [InlineData("@SUM(A1)", "'@SUM(A1)")]
    [InlineData("rifle", "rifle")]
    public void Format_TextColumn_GuardsFormulas(string value, string expected)
    {
        CsvWriter.Format(value, text: true).ShouldBe(expected);
    }

    [Fact]
    public void Format_NumberColumn_KeepsSignAndUsesInvariantCulture()
    {
        var previous = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("vi-VN");
            CsvWriter.Format(-12.5, text: false).ShouldBe("-12.5");
        }
        finally
        {
            CultureInfo.CurrentCulture = previous;
        }
    }
}
