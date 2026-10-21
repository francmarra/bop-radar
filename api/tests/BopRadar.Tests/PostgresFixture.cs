using BopRadar.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Testcontainers.PostgreSql;

namespace BopRadar.Tests;

public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder().WithImage("postgres:17").Build();

    public string ConnectionString => _container.GetConnectionString();

    public Task InitializeAsync() => _container.StartAsync();

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();

    /// <summary>Context on the shared server pointing at <paramref name="database"/>; MigrateAsync creates it.</summary>
    public BopRadarDbContext NewContext(string database)
    {
        var cs = new NpgsqlConnectionStringBuilder(ConnectionString) { Database = database }.ConnectionString;
        var options = new DbContextOptionsBuilder<BopRadarDbContext>();
        DbSetup.Configure(options, cs);
        return new BopRadarDbContext(options.Options);
    }
}

[CollectionDefinition("postgres")]
public class PostgresCollection : ICollectionFixture<PostgresFixture>;
