using BopRadar.Api.Dtos;
using BopRadar.Data;
using Microsoft.EntityFrameworkCore;

namespace BopRadar.Api.Endpoints;

public static class CarsEndpoints
{
    private static string Escape(string s) => s.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    public static RouteGroupBuilder MapCars(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/cars");

        g.MapGet("/", async (BopRadarDbContext db, string? group, string? maker, string? q, int page = 1, int pageSize = 20) =>
        {
            var errors = Validation.Paging(page, pageSize);
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var cars = db.Cars.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(group)) cars = cars.Where(c => c.Group == group);
            if (!string.IsNullOrEmpty(maker)) cars = cars.Where(c => EF.Functions.ILike(c.Maker, Escape(maker), "\\"));
            if (!string.IsNullOrEmpty(q)) cars = cars.Where(c => EF.Functions.ILike(c.Name, "%" + Escape(q) + "%", "\\"));

            // latest-date "m" entry per car; version strings do not sort chronologically
            var rows = cars.Select(c => new
            {
                Car = c,
                Latest = (from e in db.Entries
                          join u in db.Updates on e.Version equals u.Version
                          where e.CarId == c.Id && e.Set == "m"
                          orderby u.Date descending
                          select new { e.Rank, e.Tier, e.Pp }).FirstOrDefault(),
            });

            var total = await rows.CountAsync();
            var items = (await rows.OrderBy(x => x.Car.Group).ThenBy(x => x.Latest == null).ThenBy(x => x.Latest!.Rank).ThenBy(x => x.Car.Name)
                .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync())
                .Select(x => new CarSummaryDto(x.Car.Id, x.Car.Name, x.Car.Maker, x.Car.Group, x.Latest?.Rank, x.Latest?.Tier, x.Latest?.Pp))
                .ToList();
            return Results.Ok(new Page<CarSummaryDto>(items, page, pageSize, total));
        });

        g.MapGet("/{id}", async (BopRadarDbContext db, string id) =>
        {
            var car = await db.Cars.AsNoTracking().SingleOrDefaultAsync(c => c.Id == id);
            if (car is null) return Validation.NotFound($"Car '{id}' not found");

            var latest = await db.Entries.Where(e => e.CarId == id)
                .Join(db.Updates, e => e.Version, u => u.Version, (e, u) => u)
                .OrderByDescending(u => u.Date).Select(u => u.Version).FirstOrDefaultAsync();
            if (latest is null) return Validation.NotFound($"Car '{id}' has no BoP data");

            var sets = await db.Entries.AsNoTracking().Where(e => e.CarId == id && e.Version == latest)
                .ToDictionaryAsync(e => e.Set, e => new BopStatsDto(e.Rank, e.Tier, e.Pp, e.PowerPs, e.TorqueKgfm, e.WeightKg, e.PsPerT, e.Balance));
            var note = await db.Notes.AsNoTracking().Where(n => n.CarId == id && n.Version == latest).SingleOrDefaultAsync();

            return Results.Ok(new CarDetailDto(car.Id, car.Name, car.Maker, car.Drivetrain, car.Group, latest, sets,
                note is null ? null : new CarNoteDto(note.Version, note.ClassSize, note.Summary, note.Context.RootElement.Clone())));
        });

        g.MapGet("/{id}/history", async (BopRadarDbContext db, string id, string set = "m") =>
        {
            var errors = Validation.Set(set);
            if (errors.Count > 0) return Results.ValidationProblem(errors);
            if (!await db.Cars.AnyAsync(c => c.Id == id)) return Validation.NotFound($"Car '{id}' not found");

            var points = await db.Entries.AsNoTracking().Where(e => e.CarId == id && e.Set == set)
                .Join(db.Updates, e => e.Version, u => u.Version, (e, u) => new { e, u.Date })
                .OrderBy(x => x.Date)
                .Select(x => new HistoryPointDto(x.e.Version, x.Date, x.e.Changed, x.e.Pp, x.e.PowerPs, x.e.WeightKg, x.e.Rank, x.e.Tier))
                .ToListAsync();
            return Results.Ok(points);
        });

        return api;
    }
}
