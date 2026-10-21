namespace BopRadar.Tests;

public static class Fixtures
{
    public static string SiteDataDir { get; } = Path.Combine(AppContext.BaseDirectory, "fixtures", "site-data");

    /// <summary>Copy of the fixture site-data in a fresh temp dir, safe to mutate.</summary>
    public static string TempCopy()
    {
        var dir = Path.Combine(Path.GetTempPath(), "bop-" + Guid.NewGuid().ToString("N"));
        foreach (var f in Directory.GetFiles(SiteDataDir, "*", SearchOption.AllDirectories))
        {
            var dest = Path.Combine(dir, Path.GetRelativePath(SiteDataDir, f));
            Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
            File.Copy(f, dest);
        }
        return dir;
    }
}
