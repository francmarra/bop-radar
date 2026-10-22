import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseCompareParams, useCompareParams } from "./useCompareParams";

beforeEach(() => window.history.replaceState(null, "", "/"));

describe("useCompareParams", () => {
  it("normalizes ids and set from the URL", () => {
    window.history.replaceState(null, "", "/?ids=a,b,a,c,d,e&set=x");
    const before = window.history.length;
    const { result } = renderHook(() => useCompareParams());
    expect(result.current[0]).toEqual({ ids: ["a", "b", "c", "d"], set: "m" });
    expect(window.location.search).toBe("?ids=a,b,c,d&set=m");
    expect(window.history.length).toBe(before);
  });

  it("does not rewrite an already canonical URL", () => {
    window.history.replaceState(null, "", "/?ids=a,b&set=m&version=1.71");
    const spy = vi.spyOn(window.history, "replaceState");
    renderHook(() => useCompareParams());
    expect(spy).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?ids=a,b&set=m&version=1.71");
    spy.mockRestore();
  });

  it("two updates in one act both land", () => {
    const { result } = renderHook(() => useCompareParams());
    act(() => {
      result.current[1]({ ids: ["a", "b"] });
      result.current[1]({ set: "h" });
    });
    expect(window.location.search).toBe("?ids=a,b&set=h");
    expect(result.current[0]).toEqual({ ids: ["a", "b"], set: "h" });
  });

  it("keeps a valid version", () => {
    window.history.replaceState(null, "", "/?ids=a&set=h&version=v1");
    const { result } = renderHook(() => useCompareParams());
    expect(result.current[0]).toEqual({ ids: ["a"], set: "h", version: "v1" });
  });

  it("update pushes a new history entry", () => {
    const { result } = renderHook(() => useCompareParams());
    const before = window.history.length;
    act(() => result.current[1]({ ids: ["a", "b"], set: "l" }));
    expect(window.history.length).toBe(before + 1);
    expect(result.current[0]).toEqual({ ids: ["a", "b"], set: "l" });
    expect(parseCompareParams(window.location.search).ids).toEqual(["a", "b"]);
  });

  it("popstate re-reads the URL", () => {
    const { result } = renderHook(() => useCompareParams());
    window.history.replaceState(null, "", "/?ids=x,y&set=h");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current[0]).toEqual({ ids: ["x", "y"], set: "h" });
  });

  it("keeps the same ids reference while the URL does not change", () => {
    window.history.replaceState(null, "", "/?ids=a,b");
    const { result, rerender } = renderHook(() => useCompareParams());
    const first = result.current[0];
    rerender();
    expect(Object.is(result.current[0].ids, first.ids)).toBe(true);
    expect(Object.is(result.current[0], first)).toBe(true);
  });
});
