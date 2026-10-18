/* Car picture helper: <img> when we have the file, neutral silhouette otherwise. */
import { BASE } from "./router.js";
import { store } from "./data.js";
import { esc } from "./format.js";

export const SILHOUETTE = '<svg viewBox="0 0 160 64" fill="currentColor" focusable="false"><path d="M6 44c0-5 3-8 9-9l22-4 20-13c3-2 6-3 10-3h36c5 0 9 2 12 5l14 11 22 4c5 1 7 4 7 8v4c0 2-2 4-4 4h-9a15 15 0 0 0-30 0H56a15 15 0 0 0-30 0H10c-2 0-4-2-4-4z"/><circle cx="41" cy="50" r="10"/><circle cx="127" cy="50" r="10"/></svg>';

export function carImg(id, size, alt = "", eager = false) {
  const dim = Object.hasOwn(store.images ?? {}, id) ? store.images[id] : null;
  if (!dim) return `<span class="car-img car-img-${size} car-sil" aria-hidden="true">${SILHOUETTE}</span>`;
  let [w, h] = dim;
  if (size === "s") { h = Math.round((h * 160) / w); w = 160; }
  return `<img class="car-img car-img-${size}" src="${BASE}img/cars/${encodeURIComponent(id)}-${size}.webp" width="${w}" height="${h}" ${eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} decoding="async" alt="${esc(alt)}">`;
}
