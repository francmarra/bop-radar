import { useQueries, useQuery } from "@tanstack/react-query";
import {
  apiGet,
  type CarSummaryDto,
  type CompareDto,
  type HistoryPointDto,
  type PageOfCars,
  type UpdateSummaryDto,
} from "./client";

export type SetCode = "h" | "m" | "l";

export function useCarSearch(q: string) {
  return useQuery({
    queryKey: ["cars", q],
    enabled: q.trim().length >= 2,
    queryFn: async ({ signal }): Promise<CarSummaryDto[]> =>
      (await apiGet<PageOfCars>("/api/v1/cars", { q, pageSize: 10 }, signal)).items,
  });
}

export function useUpdates() {
  return useQuery({
    queryKey: ["updates"],
    staleTime: Infinity,
    queryFn: ({ signal }) => apiGet<UpdateSummaryDto[]>("/api/v1/updates", undefined, signal),
  });
}

export function useCompare(ids: string[], set: SetCode, version?: string) {
  return useQuery({
    queryKey: ["compare", ids, set, version ?? null],
    enabled: ids.length >= 2,
    queryFn: ({ signal }) =>
      apiGet<CompareDto>("/api/v1/compare", { ids: ids.join(","), set, version }, signal),
  });
}

export function useHistories(ids: string[], set: SetCode) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["history", id, set],
      enabled: ids.length >= 2,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        apiGet<HistoryPointDto[]>(`/api/v1/cars/${encodeURIComponent(id)}/history`, { set }, signal),
    })),
    combine: (results) =>
      results.map((r, i) => ({
        id: ids[i]!,
        data: r.data as HistoryPointDto[] | undefined,
        isLoading: r.isLoading,
        error: r.error as unknown,
      })),
  });
}
