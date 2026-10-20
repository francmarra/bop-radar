/* Plain-language summaries of a BoP update. DOM-free. */
// "13 cars got faster, 5 slower, 2 mixed": the first non-zero part carries the noun, the rest are short
export function classSentence(counts, label, t) {
  const parts = ["buff", "nerf", "mixed"].filter((k) => counts?.[k] > 0);
  if (!parts.length) return t("cls_none", label);
  return parts.map((k, i) => t((i ? "cls_short_" : "cls_full_") + k, counts[k])).join(", ");
}
