using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BopRadar.Api.Dtos;

namespace BopRadar.Tests.Integration;

[Collection("api")]
public class UpdatesTracksEndpointsTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Updates_ordered_by_date_desc()
    {
        var list = (await _client.GetFromJsonAsync<List<UpdateSummaryDto>>("/api/v1/updates"))!;
        Assert.True(list.Count >= 2);
        Assert.Equal("1.72", list[0].Version);
        for (var i = 1; i < list.Count; i++) Assert.True(list[i - 1].Date >= list[i].Date);
        Assert.Equal(1, list[0].ChangesByGroup["gr1"]);
    }

    [Fact]
    public async Task Update_detail_lists_changes()
    {
        var d = (await _client.GetFromJsonAsync<UpdateDetailDto>("/api/v1/updates/1.72"))!;
        var c = Assert.Single(d.Changes, x => x.CarId == "963-24");
        Assert.False(string.IsNullOrEmpty(c.Verdict));
    }

    [Fact]
    public async Task Update_unknown_is_404() =>
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/v1/updates/0.0")).StatusCode);

    [Fact]
    public async Task Tracks_list_and_detail()
    {
        var list = (await _client.GetFromJsonAsync<List<TrackSummaryDto>>("/api/v1/tracks"))!;
        var t = Assert.Single(list);
        var d = (await _client.GetFromJsonAsync<TrackDetailDto>("/api/v1/tracks/" + t.Id))!;
        Assert.Equal(JsonValueKind.Object, d.Stats.ValueKind);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/v1/tracks/nope")).StatusCode);
    }
}
