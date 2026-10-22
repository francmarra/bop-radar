import { useCallback, useEffect, useMemo, useState } from "react";
import type { SetCode } from "../api/queries";

export interface CompareParams {
  ids: string[];
  set: SetCode;
  version?: string;
}

const MAX_IDS = 4;

export function parseCompareParams(search: string): CompareParams {
  const q = new URLSearchParams(search);
  const ids = [...new Set((q.get("ids") ?? "").split(",").filter(Boolean))].slice(0, MAX_IDS);
  const s = q.get("set");
  const set: SetCode = s === "h" || s === "m" || s === "l" ? s : "m";
  const version = q.get("version") || undefined;
  return version ? { ids, set, version } : { ids, set };
}

export function toSearch(p: CompareParams): string {
  const q = new URLSearchParams();
  if (p.ids.length) q.set("ids", p.ids.join(","));
  q.set("set", p.set);
  if (p.version) q.set("version", p.version);
  return `?${q.toString().replace(/%2C/gi, ",")}`;
}

export function useCompareParams(): [CompareParams, (next: Partial<CompareParams>) => void] {
  const [search, setSearch] = useState(() => window.location.search);
  const normalized = toSearch(parseCompareParams(search));
  // Memoized on the normalized string so ids keeps its identity while the URL is unchanged.
  const params = useMemo(() => parseCompareParams(normalized), [normalized]);

  useEffect(() => {
    if (window.location.search !== normalized) {
      window.history.replaceState(null, "", normalized);
    }
  }, [normalized]);

  useEffect(() => {
    const onPop = () => setSearch(window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const update = useCallback((next: Partial<CompareParams>) => {
    const current = parseCompareParams(window.location.search);
    const nextSearch = toSearch(parseCompareParams(toSearch({ ...current, ...next })));
    window.history.pushState(null, "", nextSearch);
    setSearch(nextSearch);
  }, []);

  return [params, update];
}
