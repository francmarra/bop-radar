using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BopRadar.Api.Dtos;

namespace BopRadar.Tests.Integration;

[Collection("api")]
public class CompareEndpointsTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();
    private const string Alfa = "155-2-5-v6-ti-93";
    private const string Porsche = "963-24";

    [Fact]
    public async Task Compares_two_cars_in_request_order_at_latest_common_version()
    {
        var dto = (await _client.GetFromJsonAsync<CompareDto>($"/api/v1/compare?ids={Porsche},{Alfa}&set=m"))!;
        Assert.Equal("m", dto.Set);
        Assert.Equal("1.71", dto.Version);
        Assert.Equal([Porsche, Alfa], dto.Cars.Select(c => c.Id).ToArray());
    }

    [Fact]
    public async Task Unknown_car_is_404_naming_it()
    {
        var res = await _client.GetAsync($"/api/v1/compare?ids={Alfa},no-such-car");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Contains("no-such-car", JsonDocument.Parse(await res.Content.ReadAsStringAsync()).RootElement.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Explicit_version_missing_for_a_car_is_404() =>
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/v1/compare?ids={Alfa},{Porsche}&version=1.72")).StatusCode);

    [Theory]
    [InlineData("ids=" + Alfa)]
    [InlineData("ids=" + Alfa + "," + Porsche + "&set=x")]
    public async Task Invalid_input_is_400(string query) =>
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.GetAsync("/api/v1/compare?" + query)).StatusCode);
}
