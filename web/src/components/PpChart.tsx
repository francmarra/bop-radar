import type { HistoryPointDto } from "../api/client";
import { buildSeries, labelIndices, toPath } from "../lib/chart";
import "./PpChart.css";

type Props = { series: { id: string; name: string; points: HistoryPointDto[] }[] };

const W = 640, H = 280, L = 52, R = 16, T = 16, B = 32;
const COLORS = ["--accent", "--a", "--h", "--l"];

export function PpChart({ series }: Props) {
  const { versions, lines } = buildSeries(series);
  const all = lines.flatMap((l) => l.values).filter((v): v is number => v !== null);
  const min = Math.min(...all), max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => Math.round((L + (versions.length > 1 ? (i * (W - L - R)) / (versions.length - 1) : (W - L - R) / 2)) * 10) / 10;
  const y = (v: number) => Math.round((T + ((max - v) * (H - T - B)) / span) * 10) / 10;
  const shown = new Set(labelIndices(versions.length));
  const color = (i: number) => `var(${COLORS[i % COLORS.length]})`;

  return (
    <figure className="pp-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`PP by version for ${series.map((s) => s.name).join(", ")}`}>
        <line className="axis" x1={L} y1={T} x2={L} y2={H - B} />
        <line className="axis" x1={L} y1={H - B} x2={W - R} y2={H - B} />
        <text className="tick" x={L - 6} y={T + 4} textAnchor="end">{max.toFixed(1)}</text>
        <text className="tick" x={L - 6} y={H - B} textAnchor="end">{min.toFixed(1)}</text>
        {versions.map((v, i) =>
          shown.has(i) ? (
            <text key={v} className="tick" x={x(i)} y={H - B + 18} textAnchor="middle">{v}</text>
          ) : null,
        )}
        {lines.map((l, i) =>
          l.values.map((v, j) =>
            v === null ? null : <circle key={l.id + j} data-car={l.id} cx={x(j)} cy={y(v)} r={3} fill={color(i)} />,
          ),
        )}
        {lines.map((l, i) => (
          <path key={l.id} data-car={l.id} d={toPath(l.values, x, y)} fill="none" stroke={color(i)} strokeWidth={2} />
        ))}
      </svg>
      <figcaption>
        <ul className="legend">
          {series.map((s, i) => (
            <li key={s.id}>
              <span className="swatch" style={{ background: color(i) }} aria-hidden="true" />
              {s.name}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
