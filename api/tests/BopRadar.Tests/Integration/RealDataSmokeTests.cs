using System.Text.Json;
using BopRadar.Data.Import;
using Microsoft.EntityFrameworkCore;

namespace BopRadar.Tests.Integration;

[Collection("postgres")]
public class RealDataSmokeTests(PostgresFixture pg)
{
    static string RealSiteData()
    {
        for (var d = new DirectoryInfo(AppContext.BaseDirectory); d != null; d = d.Parent)
        {
            var candidate = Path.Combine(d.FullName, "site", "data");
            if (File.Exists(Path.Combine(candidate, "index.json"))) return candidate;
        }
        throw new DirectoryNotFoundException("site/data/index.json not found above " + AppContext.BaseDirectory);
    }

    [Fact]
    public async Task Real_site_data_imports()
    {
        var dir = RealSiteData();
        var carFiles = Directory.GetFiles(Path.Combine(dir, "cars"), "*.json").Length;
        using var index = JsonDocument.Parse(File.ReadAllText(Path.Combine(dir, "index.json")));
        var indexIds = index.RootElement.GetProperty("groups").EnumerateArray()
            .SelectMany(g => g.GetProperty("cars").EnumerateArray())
            .Select(c => c.GetProperty("id").GetString()!).ToList();
        using var tracks = JsonDocument.Parse(File.ReadAllText(Path.Combine(dir, "tracks.json")));

        await using var db = pg.NewContext("smoke_" + Guid.NewGuid().ToString("N"));
        var result = await new SiteDataImporter(db).ImportAsync(dir);

        Assert.Equal(carFiles, result.Cars);
        var dbIds = await db.Cars.Select(c => c.Id).ToListAsync();
        Assert.Empty(indexIds.Except(dbIds));
        Assert.True(result.Entries > 0);
        Assert.True(result.Changes > 0);
        Assert.Equal(tracks.RootElement.GetArrayLength(), result.Tracks);
    }
}
