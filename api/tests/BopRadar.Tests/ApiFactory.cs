using Microsoft.AspNetCore.Hosting;
using BopRadar.Data;
using BopRadar.Data.Import;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace BopRadar.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder().WithImage("postgres:17").Build();

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        var options = new DbContextOptionsBuilder<BopRadarDbContext>();
        DbSetup.Configure(options, ConnectionString);
        await using var db = new BopRadarDbContext(options.Options);
        await new SiteDataImporter(db).ImportAsync(Fixtures.SiteDataDir, CancellationToken.None);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.UseSetting("ConnectionStrings:Default", ConnectionString);

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _container.DisposeAsync();
    }
}

[CollectionDefinition("api")]
public class ApiCollection : ICollectionFixture<ApiFactory>;
