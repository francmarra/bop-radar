using System.Text.Json;

namespace BopRadar.Api.Dtos;

public record TrackSummaryDto(string Id, string Name, string Set);

public record TrackDetailDto(string Id, string Name, string Set, JsonElement Stats);
