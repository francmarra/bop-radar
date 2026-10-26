/* Plain-language summaries of a BoP update. DOM-free. */
// one-line totals across classes for the "latest BoP" card and the updates list
export const updateTotals = (counts) => Object.values(counts ?? {}).reduce((a, c) => ({ buff: a.buff + (c.buff ?? 0), nerf: a.nerf + (c.nerf ?? 0), mixed: a.mixed + (c.mixed ?? 0) }), { buff: 0, nerf: 0, mixed: 0 });
