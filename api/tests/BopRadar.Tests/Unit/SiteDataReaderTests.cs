using System.Text.Json;
using BopRadar.Data.Import;

namespace BopRadar.Tests.Unit;

public class SiteDataReaderTests
{
    static string TempCopy()
    {
        var dir = Path.Combine(Path.GetTempPath(), "bop-" + Guid.NewGuid().ToString("N"));
        foreach (var f in Directory.GetFiles(Fixtures.SiteDataDir, "*", SearchOption.AllDirectories))
        {
            var dest = Path.Combine(dir, Path.GetRelativePath(Fixtures.SiteDataDir, f));
            Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
            File.Copy(f, dest);
        }
        return dir;
    }

    [Fact]
    public void Read_maps_cars_and_entries()
    {
        var d = SiteDataReader.Read(Fixtures.SiteDataDir);
        Assert.Equal(3, d.Cars.Count);
        var alfa = Assert.Single(d.Cars, c => c.Id == "155-2-5-v6-ti-93");
        Assert.Equal("Alfa Romeo", alfa.Maker);
        Assert.Equal("gr4", alfa.Group);
        var expected = 0;
        foreach (var f in Directory.GetFiles(Path.Combine(Fixtures.SiteDataDir, "cars")))
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(f));
            foreach (var h in doc.RootElement.GetProperty("history").EnumerateArray())
                expected += h.GetProperty("sets").EnumerateObject().Count();
        }
        Assert.Equal(expected, d.Entries.Count);
    }

    [Fact]
    public void Read_builds_updates_from_history_and_index()
    {
        var d = SiteDataReader.Read(Fixtures.SiteDataDir);
        var versions = d.Updates.Select(u => u.Version).ToList();
        Assert.Equal(versions.Count, versions.Distinct().Count());
        Assert.All(d.Entries, e => Assert.Contains(e.Version, versions));
    }

    [Fact]
    public void Read_keeps_context_as_json()
    {
        var d = SiteDataReader.Read(Fixtures.SiteDataDir);
        var last = d.Notes.Single(n => n.CarId == "155-2-5-v6-ti-93" && n.Version == "1.71");
        Assert.Equal(JsonValueKind.String, last.Context.RootElement.GetProperty("best_set").ValueKind);
    }

    [Fact]
    public void Read_throws_for_missing_required_field()
    {
        var dir = TempCopy();
        var file = Path.Combine(dir, "cars", "963-24.json");
        File.WriteAllText(file, File.ReadAllText(file).Replace("\"maker\":\"Porsche\",", ""));
        var ex = Assert.Throws<SiteDataException>(() => SiteDataReader.Read(dir));
        Assert.EndsWith("963-24.json", ex.File);
        Assert.Equal("maker", ex.Field);
    }

    [Fact]
    public void Read_throws_for_unknown_car_in_update()
    {
        var dir = TempCopy();
        var file = Path.Combine(dir, "updates", "1.72.json");
        File.WriteAllText(file, File.ReadAllText(file).Replace("\"id\":\"963-24\"", "\"id\":\"no-such-car\""));
        var ex = Assert.Throws<SiteDataException>(() => SiteDataReader.Read(dir));
        Assert.EndsWith("1.72.json", ex.File);
        Assert.Equal("id", ex.Field);
    }

    [Fact]
    public void Read_throws_for_empty_dir_and_missing_index()
    {
        var empty = Path.Combine(Path.GetTempPath(), "bop-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(empty);
        Assert.Equal("index.json", Assert.Throws<SiteDataException>(() => SiteDataReader.Read(empty)).Field);

        File.WriteAllText(Path.Combine(empty, "index.json"), "{\"updates\":[]}");
        Assert.Equal("cars", Assert.Throws<SiteDataException>(() => SiteDataReader.Read(empty)).Field);
    }
}
