using BopRadar.Data;
using BopRadar.Data.Import;
using Microsoft.EntityFrameworkCore;

namespace BopRadar.Api;

public static class ImportCommand
{
    /// <summary>args = ["import", dir]. Returns the process exit code.</summary>
    public static async Task<int> RunAsync(string[] args, string connectionString)
    {
        if (args.Length != 2)
        {
            Console.Error.WriteLine("usage: import <site-data-dir>");
            return 2;
        }
        var options = new DbContextOptionsBuilder<BopRadarDbContext>();
        DbSetup.Configure(options, connectionString);
        await using var db = new BopRadarDbContext(options.Options);
        try
        {
            var result = await new SiteDataImporter(db).ImportAsync(args[1], CancellationToken.None);
            Console.WriteLine($"Imported: {result}");
            return 0;
        }
        catch (SiteDataException ex)
        {
            Console.Error.WriteLine($"Import failed: {ex.Message}");
            return 1;
        }
    }
}
