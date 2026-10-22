import type { components } from "./schema";

type Schemas = components["schemas"];
export type CarSummaryDto = Schemas["CarSummaryDto"];
export type CompareDto = Schemas["CompareDto"];
export type CompareCarDto = Schemas["CompareCarDto"];
export type BopStatsDto = Schemas["BopStatsDto"];
export type HistoryPointDto = Schemas["HistoryPointDto"];
export type UpdateSummaryDto = Schemas["UpdateSummaryDto"];
export type PageOfCars = Schemas["PageOfCarSummaryDto"];

export const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number | null;
  detail: string;
  constructor(status: number | null, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(path, API_BASE);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(null, e instanceof Error ? e.message : "Network error");
  }
  if (!res.ok) {
    const problem = (await res.json().catch(() => null)) as Schemas["HttpValidationProblemDetails"] | null;
    throw new ApiError(res.status, problem?.detail ?? problem?.title ?? res.statusText);
  }
  return (await res.json()) as T;
}
