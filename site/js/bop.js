/* Plain-language summaries of a BoP update. DOM-free. */
const absPP = (c) => Math.abs(c.delta?.pp ?? 0);

export const mostAffected = (cars = [], n = 3) =>
  cars.slice().sort((a, b) => absPP(b) - absPP(a) || a.name.localeCompare(b.name)).slice(0, n);

// "13 cars got faster, 5 slower, 2 mixed": the first non-zero part carries the noun, the rest are short
export function classSentence(counts, label, t) {
  const parts = ["buff", "nerf", "mixed"].filter((k) => counts?.[k] > 0);
  if (!parts.length) return t("cls_none", label);
  return parts.map((k, i) => t((i ? "cls_short_" : "cls_full_") + k, counts[k])).join(", ");
}
