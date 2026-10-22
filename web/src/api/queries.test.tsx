import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { histories } from "../test/fixtures";
import { server } from "../test/server";
import { API_BASE } from "./client";
import { useCompare, useHistories } from "./queries";

function renderHookWithClient<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper });
}

describe("queries", () => {
  it("useCompare is idle with fewer than 2 ids", async () => {
    let calls = 0;
    server.use(
      http.get(`${API_BASE}/api/v1/compare`, () => {
        calls++;
        return HttpResponse.json({});
      }),
    );
    const { result } = renderHookWithClient(() => useCompare(["a"], "m"));
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.fetchStatus).toBe("idle");
    expect(calls).toBe(0);
  });

  it("useHistories fetches one history per id in parallel", async () => {
    const hits: string[] = [];
    server.use(
      http.get(`${API_BASE}/api/v1/cars/:id/history`, ({ params }) => {
        const id = params.id as string;
        hits.push(id);
        return HttpResponse.json(histories[id]);
      }),
    );
    const ids = ["155-2-5-v6-ti-93", "963-24"];
    const { result } = renderHookWithClient(() => useHistories(ids, "m"));
    await waitFor(() => expect(result.current.every((h) => h.data)).toBe(true));
    expect(hits.sort()).toEqual([...ids].sort());
    expect(result.current.map((h) => h.data?.length)).toEqual([4, 2]);
  });
});
