import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, expect, it } from "vitest";
import App from "./App";
import { API_BASE } from "./api/client";
import { compare155vs963 } from "./test/fixtures";
import { handlers } from "./test/handlers";
import { renderWithClient } from "./test/render";
import { server } from "./test/server";

const URL2 = "/?ids=155-2-5-v6-ti-93,963-24";

beforeEach(() => window.history.replaceState(null, "", "/"));

function captureCompare() {
  const seen: URL[] = [];
  server.use(
    http.get(`${API_BASE}/api/v1/compare`, ({ request }) => {
      seen.push(new URL(request.url));
      return HttpResponse.json(compare155vs963);
    }),
    ...handlers,
  );
  return seen;
}

it("renders the title and the empty state", () => {
  server.use(...handlers);
  renderWithClient(<App />);
  expect(screen.getByRole("heading", { name: "BoP Radar — Compare" })).toBeInTheDocument();
  expect(screen.getByText("Pick 2 to 4 cars to compare")).toBeInTheDocument();
});

it("compares two cars picked from the search", async () => {
  server.use(...handlers);
  const user = userEvent.setup();
  renderWithClient(<App />);
  const input = screen.getByRole("combobox", { name: "Search cars" });
  await user.type(input, "155");
  await user.click(await screen.findByRole("option", { name: /155 2\.5/ }));
  await user.type(input, "963");
  await user.click(await screen.findByRole("option", { name: /963/ }));
  expect(await screen.findByRole("table", { name: "Version 1.71 · set M" })).toBeInTheDocument();
});

it("loads ids from the URL", async () => {
  window.history.replaceState(null, "", URL2);
  server.use(...handlers);
  renderWithClient(<App />);
  expect(await screen.findByRole("table")).toBeInTheDocument();
});

it("refetches with set=h when H is chosen", async () => {
  window.history.replaceState(null, "", URL2);
  const seen = captureCompare();
  const user = userEvent.setup();
  renderWithClient(<App />);
  await screen.findByRole("table");
  await user.click(screen.getByRole("radio", { name: "H" }));
  await waitFor(() => expect(seen.some((u) => u.searchParams.get("set") === "h")).toBe(true));
});

it("passes the chosen version to the API", async () => {
  window.history.replaceState(null, "", URL2);
  const seen = captureCompare();
  const user = userEvent.setup();
  renderWithClient(<App />);
  await screen.findByRole("table");
  const select = screen.getByRole("combobox", { name: "Version" });
  await within(select).findByRole("option", { name: "1.70" });
  await user.selectOptions(select, "1.70");
  await waitFor(() => expect(seen.some((u) => u.searchParams.get("version") === "1.70")).toBe(true));
  const before = seen.length;
  await user.selectOptions(select, "");
  await waitFor(() => expect(seen.length).toBeGreaterThan(before));
  expect(seen.at(-1)!.searchParams.has("version")).toBe(false);
});

it("shows the API detail on 404", async () => {
  window.history.replaceState(null, "", "/?ids=nope,nada");
  server.use(
    http.get(`${API_BASE}/api/v1/compare`, () =>
      HttpResponse.json({ title: "Not Found", detail: "Car not found: nope" }, { status: 404, headers: { "Content-Type": "application/problem+json" } }),
    ),
    ...handlers,
  );
  renderWithClient(<App />);
  expect(await screen.findByText("Car not found: nope")).toBeInTheDocument();
});

it("shows the network message and retries", async () => {
  window.history.replaceState(null, "", URL2);
  let calls = 0;
  server.use(
    http.get(`${API_BASE}/api/v1/compare`, () => {
      calls += 1;
      return calls === 1 ? HttpResponse.error() : HttpResponse.json(compare155vs963);
    }),
    ...handlers,
  );
  const user = userEvent.setup();
  renderWithClient(<App />);
  expect(await screen.findByText(`Could not reach the API (${API_BASE}). Is \`docker compose up\` running in api/?`)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("table")).toBeInTheDocument();
});
