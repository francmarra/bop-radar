/* Path-based routing. The site root is derived from this module's URL, so the same build works under
   /bop-radar/ on GitHub Pages and under / locally, at any page depth. */

export const basePath = (moduleUrl) => new URL("../", moduleUrl).pathname;
export const BASE = basePath(import.meta.url);

const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } }; // a stray % must not break routing
export const pathOf = (pathname, base = BASE) =>
  (pathname.startsWith(base) ? pathname.slice(base.length) : pathname).split("/").filter(Boolean).map(decode);

// an href as written in the HTML ("./", "week/", "../../week/" or "/bop-radar/week/" in 404.html) -> path under the root
export const rootPath = (href, base = BASE) =>
  href.startsWith(base) ? href.slice(base.length) : href.replace(/^(\.\.?\/)+/, "").replace(/^\.$/, "");

// links shared before the switch to paths looked like #/car/x
export function hashToPath(hash) {
  if (!/^#\//.test(hash ?? "")) return null;
  const segs = hash.slice(2).split("/").filter(Boolean);
  return segs.length ? segs.join("/") + "/" : "";
}

export const link = (path, base = BASE) => base + path;

export function shouldIntercept(e, a, origin, base = BASE, current = "") {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return false;
  const u = new URL(a.href);
  if (u.origin !== origin || !u.pathname.startsWith(base)) return false;
  if (u.hash && u.pathname === current) return false; // in-page anchor (skip link)
  return !u.pathname.startsWith(base + "data/") && !/\.[a-z0-9]+$/i.test(u.pathname); // pages, not files
}

export function navigate(path) {
  history.pushState(null, "", link(path));
  dispatchEvent(new PopStateEvent("popstate"));
}
