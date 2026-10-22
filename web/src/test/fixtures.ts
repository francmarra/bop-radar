import type { CarSummaryDto, CompareDto, HistoryPointDto, UpdateSummaryDto } from "../api/client";

export const cars: CarSummaryDto[] = [
  { id: "155-2-5-v6-ti-93", name: "155 2.5 V6 TI '93", maker: "Alfa Romeo", group: "gr4", rank: 12, tier: "B", pp: 612.4 },
  { id: "963-24", name: "963 '24", maker: "Porsche", group: "gr1", rank: 3, tier: "S", pp: 748.9 },
  { id: "296-gt3-23", name: "296 GT3 '23", maker: "Ferrari", group: "gr3", rank: 7, tier: "A", pp: 701.2 },
];

export const compare155vs963: CompareDto = {
  version: "1.71",
  set: "m",
  cars: [
    {
      id: "155-2-5-v6-ti-93",
      name: "155 2.5 V6 TI '93",
      maker: "Alfa Romeo",
      group: "gr4",
      stats: { rank: 12, tier: "B", pp: 612.4, powerPs: 420, torqueKgfm: 42.5, weightKg: 1180, psPerT: 0.356, balance: "neutral" },
    },
    {
      id: "963-24",
      name: "963 '24",
      maker: "Porsche",
      group: "gr1",
      stats: { rank: 3, tier: "S", pp: 748.9, powerPs: 680, torqueKgfm: 75.1, weightKg: 1040, psPerT: null, balance: "stable" },
    },
  ],
};

export const histories: Record<string, HistoryPointDto[]> = {
  "155-2-5-v6-ti-93": [
    { version: "1.68", date: "2026-06-10", changed: false, pp: 608.1, powerPs: 415, weightKg: 1190, rank: 14, tier: "B" },
    { version: "1.69", date: "2026-07-08", changed: true, pp: 610.0, powerPs: 418, weightKg: 1185, rank: 13, tier: "B" },
    { version: "1.70", date: "2026-08-12", changed: false, pp: 610.0, powerPs: 418, weightKg: 1185, rank: 13, tier: "B" },
    { version: "1.71", date: "2026-09-09", changed: true, pp: 612.4, powerPs: 420, weightKg: 1180, rank: 12, tier: "B" },
  ],
  "963-24": [
    { version: "1.70", date: "2026-08-12", changed: false, pp: 745.3, powerPs: 675, weightKg: 1045, rank: 4, tier: "S" },
    { version: "1.71", date: "2026-09-09", changed: true, pp: 748.9, powerPs: 680, weightKg: 1040, rank: 3, tier: "S" },
  ],
};

export const updates: UpdateSummaryDto[] = [
  { version: "1.72", date: "2026-10-14", changesByGroup: { gr1: 2, gr3: 5, gr4: 1 } },
  { version: "1.71", date: "2026-09-09", changesByGroup: { gr1: 3, gr4: 4 } },
  { version: "1.70", date: "2026-08-12", changesByGroup: { gr2: 1, gr3: 2 } },
];
