using System.Text.Json;

namespace BopRadar.Api.Dtos;

public record BopStatsDto(int Rank, string Tier, double Pp, int PowerPs, double TorqueKgfm, int WeightKg, double? PsPerT, string Balance);

public record CarSummaryDto(string Id, string Name, string Maker, string Group, int? Rank, string? Tier, double? Pp);

public record CarNoteDto(string Version, int ClassSize, string Summary, JsonElement Context);

public record CarDetailDto(string Id, string Name, string Maker, string Drivetrain, string Group, string LatestVersion,
    IReadOnlyDictionary<string, BopStatsDto> Sets, CarNoteDto? Note);

public record HistoryPointDto(string Version, DateOnly Date, bool Changed, double Pp, int PowerPs, int WeightKg, int Rank, string Tier);
