using System.Text.Json.Serialization;

namespace BopRadar.Api.Dtos;

// C# forbids a member named like its type, so the "page" JSON property is exposed as PageNumber.
public record Page<T>(
    IReadOnlyList<T> Items,
    [property: JsonPropertyName("page")] int PageNumber,
    int PageSize,
    int Total);
