using BopRadar.Api.Endpoints;

namespace BopRadar.Tests.Unit;

public class CompareRulesTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("a")]
    [InlineData("a,b,c,d,e")]
    [InlineData("a,a")]
    public void ValidateIds_rejects(string? ids) => Assert.True(CompareRules.ValidateIds(ids, out _).ContainsKey("ids"));

    [Fact]
    public void ValidateIds_trims_and_accepts()
    {
        Assert.Empty(CompareRules.ValidateIds("a, b", out var parsed));
        Assert.Equal(["a", "b"], parsed);
    }

    [Fact]
    public void LatestCommonVersion_picks_max_date_shared_by_all()
    {
        (string, string, DateOnly)[] rows =
        [
            ("a", "1.9", new(2025, 1, 1)), ("b", "1.9", new(2025, 1, 1)),
            ("a", "1.27", new(2025, 2, 1)), ("b", "1.27", new(2025, 2, 1)),
            ("a", "1.30", new(2025, 3, 1)),
        ];
        Assert.Equal("1.27", CompareRules.LatestCommonVersion(rows, ["a", "b"]));
    }

    [Fact]
    public void LatestCommonVersion_null_when_none_shared() =>
        Assert.Null(CompareRules.LatestCommonVersion([("a", "1.1", new(2025, 1, 1)), ("b", "1.2", new(2025, 2, 1))], ["a", "b"]));
}
