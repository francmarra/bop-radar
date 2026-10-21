using BopRadar.Data;

namespace BopRadar.Api.Endpoints;

internal static class Queries
{
    /// <summary>Escapes LIKE wildcards; use with ILike escape char "\".</summary>
    public static string EscapeLike(string s) => s.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    /// <summary>Each car's entry for <paramref name="set"/> in its greatest-DATE update (never version string order).</summary>
    public static IQueryable<CarBopEntry> LatestEntries(BopRadarDbContext db, string set) =>
        from e in db.Entries
        join u in db.Updates on e.Version equals u.Version
        where e.Set == set && !(from o in db.Entries
                                join v in db.Updates on o.Version equals v.Version
                                where o.CarId == e.CarId && o.Set == set && v.Date > u.Date
                                select 1).Any()
        select e;
}
