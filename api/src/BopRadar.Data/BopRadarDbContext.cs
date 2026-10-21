using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BopRadar.Data;

public static class DbSetup
{
    public static void Configure(DbContextOptionsBuilder b, string connectionString) =>
        b.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();
}

public class BopRadarDbContext(DbContextOptions<BopRadarDbContext> options) : DbContext(options)
{
    public DbSet<Car> Cars => Set<Car>();
    public DbSet<BopUpdate> Updates => Set<BopUpdate>();
    public DbSet<CarBopEntry> Entries => Set<CarBopEntry>();
    public DbSet<CarUpdateNote> Notes => Set<CarUpdateNote>();
    public DbSet<UpdateChange> Changes => Set<UpdateChange>();
    public DbSet<Track> Tracks => Set<Track>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<Car>(e =>
        {
            e.ToTable("cars");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Group);
            e.HasIndex(x => x.Maker);
        });

        m.Entity<BopUpdate>(e =>
        {
            e.ToTable("bop_updates");
            e.HasKey(x => x.Version);
        });

        m.Entity<CarBopEntry>(e =>
        {
            e.ToTable("car_bop_entries", t => t.HasCheckConstraint("ck_car_bop_entries_set", "\"set\" IN ('h','m','l')"));
            e.HasKey(x => new { x.CarId, x.Version, x.Set });
            e.HasOne<Car>().WithMany().HasForeignKey(x => x.CarId);
            e.HasOne<BopUpdate>().WithMany().HasForeignKey(x => x.Version);
            e.HasIndex(x => new { x.CarId, x.Set, x.Version });
        });

        m.Entity<CarUpdateNote>(e =>
        {
            e.ToTable("car_update_notes");
            e.HasKey(x => new { x.CarId, x.Version });
            e.Property(x => x.Context).HasColumnType("jsonb");
        });

        m.Entity<UpdateChange>(e =>
        {
            e.ToTable("update_changes");
            e.HasKey(x => new { x.Version, x.CarId });
            e.HasOne<BopUpdate>().WithMany().HasForeignKey(x => x.Version);
            e.HasOne<Car>().WithMany().HasForeignKey(x => x.CarId);
            e.Property(x => x.Delta).HasColumnType("jsonb");
            e.Property(x => x.Brief).HasColumnType("jsonb");
        });

        m.Entity<Track>(e =>
        {
            e.ToTable("tracks");
            e.HasKey(x => x.Id);
            e.Property(x => x.Stats).HasColumnType("jsonb");
        });
    }
}

/// <summary>Used by `dotnet ef` only.</summary>
public class DesignTimeFactory : IDesignTimeDbContextFactory<BopRadarDbContext>
{
    public BopRadarDbContext CreateDbContext(string[] args)
    {
        var cs = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
                 ?? "Host=localhost;Database=bopradar;Username=postgres;Password=postgres";
        var options = new DbContextOptionsBuilder<BopRadarDbContext>();
        DbSetup.Configure(options, cs);
        return new BopRadarDbContext(options.Options);
    }
}
