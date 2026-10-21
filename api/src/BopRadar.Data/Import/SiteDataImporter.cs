using Microsoft.EntityFrameworkCore;

namespace BopRadar.Data.Import;

public record ImportResult(int Cars, int Updates, int Entries, int Notes, int Changes, int Tracks);

public class SiteDataImporter(BopRadarDbContext db)
{
    public async Task<ImportResult> ImportAsync(string siteDataDir, CancellationToken ct = default)
    {
        await db.Database.MigrateAsync(ct);
        var data = SiteDataReader.Read(siteDataDir); // fails before any DB write

        // Execution strategy + explicit transaction: everything below commits or rolls back together.
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            db.ChangeTracker.Clear();
            await db.Changes.ExecuteDeleteAsync(ct);
            await db.Notes.ExecuteDeleteAsync(ct);
            await db.Entries.ExecuteDeleteAsync(ct);
            await db.Tracks.ExecuteDeleteAsync(ct);
            await db.Updates.ExecuteDeleteAsync(ct);
            await db.Cars.ExecuteDeleteAsync(ct);

            db.Cars.AddRange(data.Cars);
            db.Updates.AddRange(data.Updates);
            db.Entries.AddRange(data.Entries);
            db.Notes.AddRange(data.Notes);
            db.Changes.AddRange(data.Changes);
            db.Tracks.AddRange(data.Tracks);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        });

        return new ImportResult(data.Cars.Count, data.Updates.Count, data.Entries.Count,
            data.Notes.Count, data.Changes.Count, data.Tracks.Count);
    }
}
