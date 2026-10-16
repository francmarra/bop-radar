/* Light/dark theme toggle. Default follows the system; a choice is remembered when storage allows. */
const root = () => document.documentElement;
const systemTheme = () => (globalThis.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark");

export function initTheme(storage = globalThis.localStorage) {
  let saved = null;
  try { saved = storage?.getItem("theme"); } catch { /* storage blocked */ }
  if (saved === "light" || saved === "dark") { root().dataset.theme = saved; return saved; }
  return "system";
}

export function toggleTheme(storage = globalThis.localStorage) {
  const next = (root().dataset.theme || systemTheme()) === "light" ? "dark" : "light";
  root().dataset.theme = next;
  try { storage?.setItem("theme", next); } catch { /* storage blocked */ }
  return next;
}
