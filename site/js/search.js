/* Car search: pure matching + an accessible combobox (ARIA 1.2 pattern). */
import { fold, html } from "./format.js";
import { navigate } from "./router.js";
import { carImg } from "./carimg.js";

export function searchCars(index, query, limit = 8) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits = [];
  for (const g of index.groups) {
    const cls = fold(g.label);
    for (const c of g.cars) {
      const name = fold(c.name);
      const hay = `${name} ${fold(c.maker)} ${cls} ${cls.replace(".", "")}`;
      if (words.every((w) => hay.includes(w))) hits.push({ car: { id: c.id, name: c.name, maker: c.maker, group: g.id, label: g.label }, prefix: name.startsWith(words[0]) });
    }
  }
  return hits.sort((a, b) => b.prefix - a.prefix).slice(0, limit).map((h) => h.car);
}

export function mountSearch(input, index, { listbox, empty }) {
  let items = [], active = -1;
  const go = (c) => navigate(`car/${encodeURIComponent(c.id)}/`);
  const paint = () => {
    input.setAttribute("aria-expanded", String(items.length > 0));
    input.setAttribute("aria-activedescendant", active >= 0 ? `opt-${active}` : "");
    listbox.hidden = !items.length;
    listbox.innerHTML = html`${items.map((c, i) => html`<li role="option" id="opt-${i}" aria-selected="${i === active}" data-i="${i}">
      ${carImg(c.id, "s")}<span><b>${c.name}</b> <span class="muted">${c.maker} · ${c.label}</span></span></li>`)}`;
    const q = input.value.trim();
    empty.hidden = !(q && !items.length);
    empty.textContent = q ? empty.dataset.msg.replace("{q}", q) : "";
  };
  input.oninput = () => { items = searchCars(index, input.value); active = items.length ? 0 : -1; paint(); };
  input.onkeydown = (e) => {
    if (e.key === "ArrowDown" && items.length) { active = (active + 1) % items.length; paint(); e.preventDefault(); }
    else if (e.key === "ArrowUp" && items.length) { active = (active - 1 + items.length) % items.length; paint(); e.preventDefault(); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); go(items[active]); }
    else if (e.key === "Escape") { items = []; active = -1; paint(); }
  };
  listbox.onmousedown = (e) => e.preventDefault(); // keep focus in the input
  listbox.onclick = (e) => { const li = e.target.closest("[data-i]"); if (li) go(items[+li.dataset.i]); };
  input.onblur = () => setTimeout(() => { items = []; active = -1; paint(); empty.hidden = true; }, 150);
}
