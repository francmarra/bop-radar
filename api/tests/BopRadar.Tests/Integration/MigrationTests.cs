using BopRadar.Data;
using Microsoft.EntityFrameworkCore;

namespace BopRadar.Tests.Integration;

[Collection("postgres")]
public class MigrationTests(PostgresFixture pg)
{
    [Fact]
    public async Task Migrate_creates_all_tables()
    {
        await using var db = pg.NewContext("migration_test");
        await db.Database.MigrateAsync();

        var tables = await db.Database
            .SqlQuery<string>($"SELECT table_name AS \"Value\" FROM information_schema.tables WHERE table_schema = 'public'")
            .ToListAsync();

        string[] expected = ["cars", "bop_updates", "car_bop_entries", "car_update_notes", "update_changes", "tracks"];
        Assert.Empty(expected.Except(tables));
    }
}
