import { http, HttpResponse } from "msw";
import { API_BASE } from "../api/client";
import { cars, compare155vs963, histories, updates } from "./fixtures";

export const handlers = [
  http.get(`${API_BASE}/api/v1/cars`, ({ request }) => {
    const q = (new URL(request.url).searchParams.get("q") ?? "").toLowerCase();
    const items = cars.filter((c) => `${c.name} ${c.maker}`.toLowerCase().includes(q));
    return HttpResponse.json({ items, page: 1, pageSize: 10, total: items.length });
  }),
  http.get(`${API_BASE}/api/v1/compare`, () => HttpResponse.json(compare155vs963)),
  http.get(`${API_BASE}/api/v1/cars/:id/history`, ({ params }) =>
    HttpResponse.json(histories[params.id as string] ?? []),
  ),
  http.get(`${API_BASE}/api/v1/updates`, () => HttpResponse.json(updates)),
];
