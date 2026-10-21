using BopRadar.Api.Dtos;
using BopRadar.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.HttpResults;

namespace BopRadar.Api.Endpoints;

public static class CarsEndpoints
{
    public static RouteGroupBuilder MapCars(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/cars");

        g.MapGet("/", async Task<Results<Ok<Page<CarSummaryDto>>, ValidationProblem>> (BopRadarDbContext db, string? group, string? maker, string? q, int page = 1, int pageSize = 20) =>
        {
            var errors = Validation.Paging(page, pageSize);
            if (errors.Count > 0) return TypedResults.ValidationProblem(errors);

            var cars = db.Cars.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(group)) cars = cars.Where(c => c.Group == group);
            if (!string.IsNullOrEmpty(maker)) cars = cars.Where(c => EF.Functions.ILike(c.Maker, Queries.EscapeLike(maker), "\\"));
            if (!string.IsNullOrEmpty(q)) cars = cars.Where(c => EF.Functions.ILike(c.Name, "%" + Queries.EscapeLike(q) + "%", "\\"));

            var total = await cars.CountAsync();
            var latest = Queries.LatestEntries(db, "m");
            var items = await cars.Select(c => new
                {
                    c.Id, c.Name, c.Maker, c.Group,
                    L = latest.Where(e => e.CarId == c.Id).Select(e => new { e.Rank, e.Tier, e.Pp }).FirstOrDefault(),
                })
                .OrderBy(x => x.Group).ThenBy(x => x.L == null).ThenBy(x => x.L!.Rank).ThenBy(x => x.Name).ThenBy(x => x.Id)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .Select(x => new CarSummaryDto(x.Id, x.Name, x.Maker, x.Group,
                    x.L == null ? null : x.L.Rank, x.L == null ? null : x.L.Tier, x.L == null ? null : x.L.Pp))
                .ToListAsync();
            return TypedResults.Ok(new Page<CarSummaryDto>(items, page, pageSize, total));
        });

        g.MapGet("/{id}", async Task<Results<Ok<CarDetailDto>, ProblemHttpResult>> (BopRadarDbContext db, string id) =>
        {
            var car = await db.Cars.AsNoTracking().Where(c => c.Id == id)
                .Select(c => new { c.Id, c.Name, c.Maker, c.Drivetrain, c.Group }).SingleOrDefaultAsync();
            if (car is null) return Validation.NotFound($"Car '{id}' not found");

            var version = await Queries.LatestEntries(db, "m").Where(e => e.CarId == id).Select(e => e.Version).FirstOrDefaultAsync();
            if (version is null) return Validation.NotFound($"Car '{id}' has no BoP data");

            var sets = await db.Entries.AsNoTracking().Where(e => e.CarId == id && e.Version == version)
                .Select(e => new { e.Set, Stats = new BopStatsDto(e.Rank, e.Tier, e.Pp, e.PowerPs, e.TorqueKgfm, e.WeightKg, e.PsPerT, e.Balance) }).ToDictionaryAsync(x => x.Set, x => x.Stats);
            var note = await db.Notes.AsNoTracking().Where(n => n.CarId == id && n.Version == version)
                .Select(n => new { n.Version, n.ClassSize, n.Summary, n.Context }).SingleOrDefaultAsync();

            return TypedResults.Ok(new CarDetailDto(car.Id, car.Name, car.Maker, car.Drivetrain, car.Group, version, sets,
                note is null ? null : new CarNoteDto(note.Version, note.ClassSize, note.Summary, note.Context.RootElement.Clone())));
        });

        g.MapGet("/{id}/history", async Task<Results<Ok<List<HistoryPointDto>>, ValidationProblem, ProblemHttpResult>> (BopRadarDbContext db, string id, string set = "m") =>
        {
            var errors = Validation.Set(set);
            if (errors.Count > 0) return TypedResults.ValidationProblem(errors);
            if (!await db.Cars.AnyAsync(c => c.Id == id)) return Validation.NotFound($"Car '{id}' not found");

            var points = await db.Entries.AsNoTracking().Where(e => e.CarId == id && e.Set == set)
                .Join(db.Updates, e => e.Version, u => u.Version, (e, u) => new { e, u.Date })
                .OrderBy(x => x.Date).ThenBy(x => x.e.Version)
                .Select(x => new HistoryPointDto(x.e.Version, x.Date, x.e.Changed, x.e.Pp, x.e.PowerPs, x.e.WeightKg, x.e.Rank, x.e.Tier))
                .ToListAsync();
            return TypedResults.Ok(points);
        });

        return api;
    }
}
