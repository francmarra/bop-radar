/* Plain-language summaries of a BoP update. DOM-free. */
// "13 cars got faster, 5 slower, 2 mixed": the first non-zero part carries the noun, the rest are short
export function classSentence(counts, label, t) {
  const parts = ["buff", "nerf", "mixed"].filter((k) => counts?.[k] > 0);
  if (!parts.length) return t("cls_none", label);
  return parts.map((k, i) => t((i ? "cls_short_" : "cls_full_") + k, counts[k])).join(", ");
}
// one-line totals across classes for the "latest BoP" card and the updates list
export const updateTotals = (counts) => Object.values(counts ?? {}).reduce((a, c) => ({ buff: a.buff + (c.buff ?? 0), nerf: a.nerf + (c.nerf ?? 0), mixed: a.mixed + (c.mixed ?? 0) }), { buff: 0, nerf: 0, mixed: 0 });
