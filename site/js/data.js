/* Data loading and shared state. */
const cache = {};
export const store = { index: null, tracks: null };
export const state = { group: "gr3", set: "m", q: "", tq: "" };
export const load = (path) => (cache[path] ??= fetch("data/" + path).then((r) => { if (!r.ok) throw new Error(path); return r.json(); }));
export const getIndex = async () => (store.index ??= await load("index.json"));
export const groupLabel = (ix, id) => ix.groups.find((g) => g.id === id)?.label ?? id;
export const carById = (ix, id) => ix.groups.flatMap((g) => g.cars).find((c) => c.id === id);
