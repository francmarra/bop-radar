import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect } from "vitest";
import { server } from "./server";

// Collect unhandled requests so a UI that swallows the fetch error still fails the test.
const unhandled: string[] = [];
server.events.on("request:unhandled", ({ request }) => {
  unhandled.push(`${request.method} ${request.url}`);
});

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  const seen = unhandled.splice(0);
  expect(seen).toEqual([]);
});
afterAll(() => server.close());
