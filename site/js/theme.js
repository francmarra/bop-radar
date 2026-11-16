/* Light/dark theme toggle. Dark by default (the pit-wall look); a choice is remembered when storage allows. */
const root = () => document.documentElement;

export function initTheme(storage) {
  let saved = null;
  try { saved = (storage ?? globalThis.localStorage)?.getItem("theme"); } catch { /* storage blocked */ }
  if (saved === "light" || saved === "dark") { root().dataset.theme = saved; return saved; }
  return "system";
}

export function toggleTheme(storage) {
  const next = root().dataset.theme === "light" ? "dark" : "light";
  root().dataset.theme = next;
  try { (storage ?? globalThis.localStorage)?.setItem("theme", next); } catch { /* storage blocked */ }
  return next;
}
