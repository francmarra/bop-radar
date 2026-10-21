using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BopRadar.Api.Dtos;

namespace BopRadar.Tests.Integration;

[Collection("api")]
public class CarsEndpointsTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();
    private const string Alfa = "155-2-5-v6-ti-93";

    private async Task<Page<CarSummaryDto>> List(string query) =>
        (await _client.GetFromJsonAsync<Page<CarSummaryDto>>("/api/v1/cars" + query))!;

    private static JsonElement[] FixtureHistory() =>
        JsonDocument.Parse(File.ReadAllText(Path.Combine(Fixtures.SiteDataDir, "cars", Alfa + ".json")))
            .RootElement.GetProperty("history").EnumerateArray().ToArray();

    private async Task AssertProblem(string url, string key)
    {
        var res = await _client.GetAsync(url);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
        Assert.True(JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement.GetProperty("errors").TryGetProperty(key, out _));
    }

    [Fact]
    public async Task List_pages_and_counts()
    {
        var p = await List("?pageSize=2");
        Assert.Equal(3, p.Total);
        Assert.Equal(2, p.Items.Count);
        Assert.Equal(1, p.PageNumber);
        Assert.Equal(2, p.PageSize);
    }

    [Fact]
    public async Task List_filters_group_and_maker()
    {
        Assert.Equal(Alfa, Assert.Single((await List("?group=gr4")).Items).Id);
        Assert.Equal(Alfa, Assert.Single((await List("?maker=alfa romeo")).Items).Id);
    }

    [Fact]
    public async Task List_search_is_case_insensitive_and_literal()
    {
        Assert.Equal(Alfa, Assert.Single((await List("?q=155")).Items).Id);
        Assert.Equal(Alfa, Assert.Single((await List("?q=v6")).Items).Id);
        Assert.Equal(0, (await List("?q=%25")).Total);
    }

    [Fact]
    public async Task List_rejects_bad_paging()
    {
        await AssertProblem("/api/v1/cars?page=0", "page");
        await AssertProblem("/api/v1/cars?pageSize=101", "pageSize");
    }

    [Fact]
    public async Task List_items_carry_latest_m_entry_and_are_ordered()
    {
        var m = FixtureHistory().MaxBy(h => h.GetProperty("date").GetString())!.GetProperty("sets").GetProperty("m");
        var all = (await List("")).Items;
        var alfa = all.Single(c => c.Id == Alfa);
        Assert.Equal(m.GetProperty("rank").GetInt32(), alfa.Rank);
        Assert.Equal(m.GetProperty("tier").GetString(), alfa.Tier);
        Assert.Equal(m.GetProperty("pp").GetDouble(), alfa.Pp);

        var expected = all.OrderBy(c => c.Group, StringComparer.Ordinal).ThenBy(c => c.Rank is null).ThenBy(c => c.Rank)
            .ThenBy(c => c.Name, StringComparer.Ordinal).Select(c => c.Id);
        Assert.Equal(expected, all.Select(c => c.Id));
    }

    [Fact]
    public async Task Detail_returns_latest_sets_and_note()
    {
        var latest = FixtureHistory().MaxBy(h => h.GetProperty("date").GetString())!.GetProperty("v").GetString();
        var d = (await _client.GetFromJsonAsync<CarDetailDto>("/api/v1/cars/" + Alfa))!;
        Assert.Equal(latest, d.LatestVersion);
        Assert.NotEmpty(d.Sets);
        Assert.All(d.Sets.Keys, k => Assert.Contains(k, new[] { "h", "m", "l" }));
        Assert.Equal(latest, d.Note!.Version);
    }

    [Fact]
    public async Task Detail_unknown_is_404()
    {
        var res = await _client.GetAsync("/api/v1/cars/no-such-car");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task History_is_ordered_by_date()
    {
        var h = (await _client.GetFromJsonAsync<List<HistoryPointDto>>($"/api/v1/cars/{Alfa}/history?set=m"))!;
        Assert.Equal(FixtureHistory().Length, h.Count);
        for (var i = 1; i < h.Count; i++) Assert.True(h[i].Date > h[i - 1].Date);
    }

    [Fact]
    public async Task History_rejects_bad_set() => await AssertProblem($"/api/v1/cars/{Alfa}/history?set=x", "set");
}
