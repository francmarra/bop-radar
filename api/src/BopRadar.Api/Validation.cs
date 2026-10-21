using Microsoft.AspNetCore.Http.HttpResults;

namespace BopRadar.Api;

public static class Validation
{
    /// <summary>Empty dictionary = valid.</summary>
    public static Dictionary<string, string[]> Paging(int page, int pageSize)
    {
        var e = new Dictionary<string, string[]>();
        if (page < 1) e["page"] = ["page must be >= 1"];
        if (pageSize is < 1 or > 100) e["pageSize"] = ["pageSize must be between 1 and 100"];
        else if (page > int.MaxValue / pageSize) e["page"] = ["page is too large"]; // (page-1)*pageSize must fit an int
        return e;
    }

    public static Dictionary<string, string[]> Set(string set) =>
        set is "h" or "m" or "l" ? [] : new() { ["set"] = ["set must be one of: h, m, l"] };

    public static ProblemHttpResult NotFound(string what) =>
        TypedResults.Problem(statusCode: 404, title: "Not found", detail: what);
}
