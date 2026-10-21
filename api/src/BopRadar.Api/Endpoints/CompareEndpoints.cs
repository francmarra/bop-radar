using BopRadar.Api.Dtos;
using BopRadar.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.HttpResults;

namespace BopRadar.Api.Endpoints;

public static class CompareRules
{
    public static Dictionary<string, string[]> ValidateIds(string? ids, out string[] parsed)
    {
        parsed = (ids ?? "").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parsed.Length is < 2 or > 4) return new() { ["ids"] = ["ids must contain 2 to 4 comma-separated car ids"] };
        if (parsed.Distinct().Count() != parsed.Length) return new() { ["ids"] = ["ids must be distinct"] };
        return [];
    }

    /// <summary>Version (greatest date; equal dates tie-break on greater Version) that every id has a row for, or null.</summary>
    public static string? LatestCommonVersion(IEnumerable<(string CarId, string Version, DateOnly Date)> rows, IReadOnlyCollection<string> carIds) =>
        rows.Where(r => carIds.Contains(r.CarId))
            .GroupBy(r => (r.Version, r.Date))
            .Where(g => g.Select(r => r.CarId).Distinct().Count() == carIds.Count)
            .OrderByDescending(g => g.Key.Date).ThenByDescending(g => g.Key.Version, StringComparer.Ordinal)
            .Select(g => g.Key.Version).FirstOrDefault();
}

public static class CompareEndpoints
{
    public static RouteGroupBuilder MapCompare(this RouteGroupBuilder api)
    {
        api.MapGet("/compare", async Task<Results<Ok<CompareDto>, ValidationProblem, ProblemHttpResult>> (BopRadarDbContext db, string? ids, string? version, string set = "m") =>
        {
            var errors = Validation.Set(set);
            var idErrors = CompareRules.ValidateIds(ids, out var parsed);
            foreach (var kv in idErrors) errors[kv.Key] = kv.Value;
            if (errors.Count > 0) return TypedResults.ValidationProblem(errors);

            var cars = await db.Cars.AsNoTracking().Where(c => parsed.Contains(c.Id))
                .Select(c => new { c.Id, c.Name, c.Maker, c.Group }).ToDictionaryAsync(c => c.Id);
            var missing = parsed.Where(i => !cars.ContainsKey(i)).ToArray();
            if (missing.Length > 0) return Validation.NotFound($"Car(s) not found: {string.Join(", ", missing)}");

            if (version is null)
            {
                var rows = await db.Entries.AsNoTracking().Where(e => e.Set == set && parsed.Contains(e.CarId))
                    .Join(db.Updates, e => e.Version, u => u.Version, (e, u) => new { e.CarId, e.Version, u.Date }).ToListAsync();
                version = CompareRules.LatestCommonVersion(rows.Select(r => (r.CarId, r.Version, r.Date)), parsed);
                if (version is null) return Validation.NotFound("The cars share no BoP version for this set");
            }

            var stats = await db.Entries.AsNoTracking().Where(e => e.Set == set && e.Version == version && parsed.Contains(e.CarId))
                .Select(e => new { e.CarId, Stats = new BopStatsDto(e.Rank, e.Tier, e.Pp, e.PowerPs, e.TorqueKgfm, e.WeightKg, e.PsPerT, e.Balance) })
                .ToDictionaryAsync(x => x.CarId, x => x.Stats);
            var noEntry = parsed.Where(i => !stats.ContainsKey(i)).ToArray();
            if (noEntry.Length > 0) return Validation.NotFound($"No BoP entry for version '{version}', set '{set}': {string.Join(", ", noEntry)}");

            return TypedResults.Ok(new CompareDto(version, set,
                parsed.Select(i => new CompareCarDto(i, cars[i].Name, cars[i].Maker, cars[i].Group, stats[i])).ToList()));
        });
        return api;
    }
}
