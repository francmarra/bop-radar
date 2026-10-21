using System.Net;
using BopRadar.Api;
using Npgsql;

namespace BopRadar.Tests.Integration;

[Collection("api")]
public class HostTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Health_returns_200_when_db_up() =>
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/health")).StatusCode);

    [Fact]
    public async Task Docs_and_openapi_are_served()
    {
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/openapi/v1.json")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/docs")).StatusCode);
    }

    [Fact]
    public async Task Openapi_carries_dto_schemas()
    {
        Assert.Contains("CarSummaryDto", await _client.GetStringAsync("/openapi/v1.json"));
    }

    [Fact]
    public async Task Unknown_route_is_problem_details()
    {
        var res = await _client.GetAsync("/api/v1/nope");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Cors_allows_pages_origin()
    {
        var ok = new HttpRequestMessage(HttpMethod.Get, "/health");
        ok.Headers.Add("Origin", "https://francmarra.github.io");
        var res = await _client.SendAsync(ok);
        Assert.Equal("https://francmarra.github.io", res.Headers.GetValues("Access-Control-Allow-Origin").Single());

        var bad = new HttpRequestMessage(HttpMethod.Get, "/health");
        bad.Headers.Add("Origin", "https://evil.example");
        Assert.False((await _client.SendAsync(bad)).Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Import_command_exit_codes()
    {
        // separate database on the same server; MigrateAsync creates it
        var cs = new NpgsqlConnectionStringBuilder(factory.ConnectionString) { Database = "import_cmd" }.ConnectionString;
        Assert.Equal(0, await ImportCommand.RunAsync(["import", Fixtures.SiteDataDir], cs));
        var empty = Directory.CreateTempSubdirectory().FullName;
        Assert.Equal(1, await ImportCommand.RunAsync(["import", empty], cs));
    }
}
