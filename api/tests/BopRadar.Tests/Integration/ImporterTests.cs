using System.Text.Json.Nodes;
using BopRadar.Data;
using BopRadar.Data.Import;
using Microsoft.EntityFrameworkCore;

namespace BopRadar.Tests.Integration;

[Collection("postgres")]
public class ImporterTests(PostgresFixture pg)
{
    static string Db() => "imp_" + Guid.NewGuid().ToString("N");

    static async Task<int[]> Counts(BopRadarDbContext db) =>
    [
        await db.Cars.CountAsync(), await db.Updates.CountAsync(), await db.Entries.CountAsync(),
        await db.Notes.CountAsync(), await db.Changes.CountAsync(), await db.Tracks.CountAsync(),
    ];

    [Fact]
    public async Task Import_twice_gives_same_counts()
    {
        await using var db = pg.NewContext(Db());
        var importer = new SiteDataImporter(db);
        var first = await importer.ImportAsync(Fixtures.SiteDataDir);
        var second = await importer.ImportAsync(Fixtures.SiteDataDir);
        Assert.Equal(first, second);
        Assert.Equal(
            [first.Cars, first.Updates, first.Entries, first.Notes, first.Changes, first.Tracks],
            await Counts(db));
        Assert.True(first.Cars > 0 && first.Entries > 0);
    }

    [Fact]
    public async Task Import_mirrors_removed_car()
    {
        await using var db = pg.NewContext(Db());
        var importer = new SiteDataImporter(db);
        await importer.ImportAsync(Fixtures.SiteDataDir);

        const string id = "963-24";
        var dir = Fixtures.TempCopy();
        File.Delete(Path.Combine(dir, "cars", id + ".json"));
        foreach (var f in Directory.GetFiles(Path.Combine(dir, "updates")))
        {
            var root = JsonNode.Parse(File.ReadAllText(f))!;
            foreach (var group in root["groups"]!.AsObject())
            {
                var items = group.Value!.AsArray();
                foreach (var item in items.Where(i => (string?)i!["id"] == id).ToList()) items.Remove(item);
            }
            File.WriteAllText(f, root.ToJsonString());
        }

        await importer.ImportAsync(dir);
        Assert.False(await db.Cars.AnyAsync(c => c.Id == id));
        Assert.False(await db.Entries.AnyAsync(e => e.CarId == id));
        Assert.True(await db.Cars.CountAsync() == 2);
    }

    [Fact]
    public async Task Import_invalid_json_rolls_back()
    {
        await using var db = pg.NewContext(Db());
        var importer = new SiteDataImporter(db);
        await importer.ImportAsync(Fixtures.SiteDataDir);
        var before = await Counts(db);

        var dir = Fixtures.TempCopy();
        File.WriteAllText(Path.Combine(dir, "cars", "963-24.json"), "{");
        await Assert.ThrowsAsync<SiteDataException>(() => importer.ImportAsync(dir));
        Assert.Equal(before, await Counts(db));
    }

    [Fact]
    public async Task Import_empty_dir_keeps_data()
    {
        await using var db = pg.NewContext(Db());
        var importer = new SiteDataImporter(db);
        await importer.ImportAsync(Fixtures.SiteDataDir);
        var before = await db.Cars.CountAsync();

        var empty = Path.Combine(Path.GetTempPath(), "bop-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(empty);
        await Assert.ThrowsAsync<SiteDataException>(() => importer.ImportAsync(empty));
        Assert.Equal(before, await db.Cars.CountAsync());
    }

    [Fact]
    public async Task Import_db_failure_after_deletes_rolls_back()
    {
        await using var db = pg.NewContext(Db());
        var importer = new SiteDataImporter(db);
        await importer.ImportAsync(Fixtures.SiteDataDir);
        var before = await Counts(db);

        // Reader accepts a NUL char in a name; Postgres rejects it at SaveChanges, after the deletes ran.
        var dir = Fixtures.TempCopy();
        var file = Path.Combine(dir, "cars", "963-24.json");
        var root = JsonNode.Parse(File.ReadAllText(file))!;
        root["name"] = "bad\u0000name";
        File.WriteAllText(file, root.ToJsonString());

        await Assert.ThrowsAnyAsync<Microsoft.EntityFrameworkCore.DbUpdateException>(() => importer.ImportAsync(dir));
        Assert.Equal(before, await Counts(db));
    }
}
