namespace BopRadar.Api.Dtos;

public record CompareCarDto(string Id, string Name, string Maker, string Group, BopStatsDto Stats);

public record CompareDto(string Version, string Set, IReadOnlyList<CompareCarDto> Cars);
