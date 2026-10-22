import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./client";

// Never retry 4xx (the detail is final); otherwise at most one retry.
const retry = (count: number, e: unknown) =>
  !(e instanceof ApiError && e.status !== null && e.status < 500) && count < 1;

export function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry } } });
}
