import type { CompareCarDto, CompareDto } from "../api/client";
import { bestIndexes, METRIC_DIRECTION, type Metric } from "../lib/best";
import "./CompareTable.css";

type Row = { label: string; cell(c: CompareCarDto): string | number | null | undefined; metric?: Metric };

const ROWS: Row[] = [
  { label: "Group", cell: (c) => c.group },
  { label: "Rank", cell: (c) => c.stats.rank, metric: "rank" },
  { label: "Tier", cell: (c) => c.stats.tier },
  { label: "PP", cell: (c) => c.stats.pp, metric: "pp" },
  { label: "Power (PS)", cell: (c) => c.stats.powerPs, metric: "powerPs" },
  { label: "Torque (kgfm)", cell: (c) => c.stats.torqueKgfm, metric: "torqueKgfm" },
  { label: "Weight (kg)", cell: (c) => c.stats.weightKg, metric: "weightKg" },
  { label: "PS/t", cell: (c) => c.stats.psPerT, metric: "psPerT" },
  { label: "Balance", cell: (c) => c.stats.balance },
];

export function CompareTable({ data }: { data: CompareDto }) {
  // Rank is per class: only comparable when every car is in the same group.
  const sameGroup = data.cars.every((c) => c.group === data.cars[0]!.group);
  return (
    <div className="compare-table-wrap">
      <table className="compare-table">
        <caption>{`Version ${data.version} · set ${data.set.toUpperCase()}`}</caption>
        <thead>
          <tr>
            <td />
            {data.cars.map((c) => (
              <th key={c.id} scope="col">
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const values = data.cars.map(row.cell);
            const best = row.metric && (row.metric !== "rank" || sameGroup)
              ? bestIndexes(
                  values.map((v) => (typeof v === "number" ? v : null)),
                  METRIC_DIRECTION[row.metric],
                )
              : new Set<number>();
            return (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {values.map((v, i) => (
                  <td key={data.cars[i]!.id} className={best.has(i) ? "best" : undefined}>
                    {v ?? "—"}
                    {best.has(i) && (
                      <>
                        <span aria-hidden="true"> ★</span>
                        <span className="sr-only"> best</span>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
