import { QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { makeQueryClient } from "../api/queryClient";

/** Same client as production; retries off and no cache unless `realRetry` is set. */
export function renderWithClient(ui: ReactElement, opts: { realRetry?: boolean } = {}): RenderResult & { client: ReturnType<typeof makeQueryClient> } {
  const client = makeQueryClient();
  if (!opts.realRetry) {
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false, gcTime: 0 } });
  }
  return { ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>), client };
}
