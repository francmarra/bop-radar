using BopRadar.Api.Dtos;
using BopRadar.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.HttpResults;

namespace BopRadar.Api.Endpoints;

public static class TracksEndpoints
{
    public static RouteGroupBuilder MapTracks(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/tracks");

        g.MapGet("/", async Task<Ok<List<TrackSummaryDto>>> (BopRadarDbContext db) =>
            TypedResults.Ok(await db.Tracks.AsNoTracking().OrderBy(t => t.Name).ThenBy(t => t.Id)
                .Select(t => new TrackSummaryDto(t.Id, t.Name, t.Set)).ToListAsync()));

        g.MapGet("/{id}", async Task<Results<Ok<TrackDetailDto>, ProblemHttpResult>> (BopRadarDbContext db, string id) =>
        {
            var t = await db.Tracks.AsNoTracking().Where(t => t.Id == id)
                .Select(t => new { t.Id, t.Name, t.Set, t.Stats }).SingleOrDefaultAsync();
            return t is null ? Validation.NotFound($"Track '{id}' not found")
                : TypedResults.Ok(new TrackDetailDto(t.Id, t.Name, t.Set, t.Stats.RootElement.Clone()));
        });

        return api;
    }
}
