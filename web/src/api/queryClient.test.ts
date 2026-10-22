import { expect, it } from "vitest";
import { makeQueryClient } from "./queryClient";

it("keeps data fresh for 5 minutes (BoP data changes weekly)", () => {
  expect(makeQueryClient().getDefaultOptions().queries?.staleTime).toBe(5 * 60_000);
});
