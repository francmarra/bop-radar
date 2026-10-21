using System.Text.Json;

namespace BopRadar.Api.Dtos;

public record UpdateSummaryDto(string Version, DateOnly Date, IReadOnlyDictionary<string, int> ChangesByGroup);

public record UpdateChangeDto(string CarId, string Name, string Group, string Verdict, JsonElement Delta, int Rank, string Summary);

public record UpdateDetailDto(string Version, DateOnly Date, IReadOnlyList<UpdateChangeDto> Changes);
