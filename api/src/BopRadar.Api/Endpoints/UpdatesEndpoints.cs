using BopRadar.Api.Dtos;
using BopRadar.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.HttpResults;

namespace BopRadar.Api.Endpoints;

public static class UpdatesEndpoints
{
    public static RouteGroupBuilder MapUpdates(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/updates");

        g.MapGet("/", async Task<Ok<IEnumerable<UpdateSummaryDto>>> (BopRadarDbContext db) =>
        {
            var updates = await db.Updates.AsNoTracking()
                .OrderByDescending(u => u.Date).ThenByDescending(u => u.Version)
                .Select(u => new { u.Version, u.Date }).ToListAsync();
            var counts = await db.Changes.AsNoTracking()
                .Join(db.Cars, ch => ch.CarId, c => c.Id, (ch, c) => new { ch.Version, c.Group })
                .GroupBy(x => new { x.Version, x.Group })
                .Select(x => new { x.Key.Version, x.Key.Group, N = x.Count() }).ToListAsync();
            var byVersion = counts.GroupBy(x => x.Version).ToDictionary(x => x.Key, x => x.ToDictionary(y => y.Group, y => y.N));
            return TypedResults.Ok(updates.Select(u => new UpdateSummaryDto(u.Version, u.Date,
                byVersion.GetValueOrDefault(u.Version) ?? [])));
        });

        g.MapGet("/{version}", async Task<Results<Ok<UpdateDetailDto>, ProblemHttpResult>> (BopRadarDbContext db, string version) =>
        {
            var update = await db.Updates.AsNoTracking().Where(u => u.Version == version)
                .Select(u => new { u.Version, u.Date }).SingleOrDefaultAsync();
            if (update is null) return Validation.NotFound($"Update '{version}' not found");

            // Delta is a JsonDocument: select it raw, convert in memory.
            var rows = await db.Changes.AsNoTracking().Where(ch => ch.Version == version)
                .Join(db.Cars, ch => ch.CarId, c => c.Id, (ch, c) => new { ch.CarId, c.Name, c.Group, ch.Verdict, ch.Delta, ch.Rank, ch.Summary })
                .OrderBy(x => x.Group).ThenBy(x => x.Rank).ThenBy(x => x.CarId)
                .ToListAsync();
            var changes = rows.Select(x => new UpdateChangeDto(x.CarId, x.Name, x.Group, x.Verdict, x.Delta.RootElement.Clone(), x.Rank, x.Summary)).ToList();
            return TypedResults.Ok(new UpdateDetailDto(update.Version, update.Date, changes));
        });

        return api;
    }
}
