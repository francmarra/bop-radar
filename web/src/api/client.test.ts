import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/server";
import { API_BASE, ApiError, apiGet } from "./client";

describe("apiGet", () => {
  it("builds the query string and skips undefined params", async () => {
    let url = "";
    server.use(
      http.get(`${API_BASE}/api/v1/cars`, ({ request }) => {
        url = request.url;
        return HttpResponse.json({});
      }),
    );
    await apiGet("/api/v1/cars", { q: "155", pageSize: 10, version: undefined });
    expect(url).toBe(`${API_BASE}/api/v1/cars?q=155&pageSize=10`);
  });

  it("throws ApiError with the problem detail on 404", async () => {
    server.use(
      http.get(`${API_BASE}/api/v1/cars/x`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Not Found", status: 404, detail: "Car not found: x" },
          { status: 404, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );
    const err = await apiGet("/api/v1/cars/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, detail: "Car not found: x" });
  });

  it("throws ApiError with status null on network error", async () => {
    server.use(http.get(`${API_BASE}/api/v1/updates`, () => HttpResponse.error()));
    const err = await apiGet("/api/v1/updates").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBeNull();
  });
});

describe("apiGet abort", () => {
  it("does not turn an aborted request into an ApiError", async () => {
    server.use(
      http.get(`${API_BASE}/api/v1/updates`, async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json([]);
      }),
    );
    const ctrl = new AbortController();
    const pending = apiGet("/api/v1/updates", undefined, ctrl.signal).catch((e: unknown) => e);
    setTimeout(() => ctrl.abort(), 20);
    const err = await pending;
    expect(err).not.toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ name: "AbortError" });
  });
});
