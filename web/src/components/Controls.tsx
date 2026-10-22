import { useUpdates, type SetCode } from "../api/queries";
import type { CompareParams } from "../state/useCompareParams";
import "./Controls.css";

type Props = { set: SetCode; version?: string; onChange(next: Partial<CompareParams>): void };

const SETS: SetCode[] = ["h", "m", "l"];

export function Controls({ set, version, onChange }: Props) {
  const updates = useUpdates();
  return (
    <div className="controls">
      <fieldset>
        <legend>Set</legend>
        {SETS.map((s) => (
          <label key={s} className="controls-radio">
            <input type="radio" name="set" value={s} checked={set === s} onChange={() => onChange({ set: s })} />
            {s.toUpperCase()}
          </label>
        ))}
      </fieldset>
      <label className="controls-version">
        Version
        <select value={version ?? ""} onChange={(e) => onChange({ version: e.target.value || undefined })}>
          <option value="">Latest common</option>
          {version && !updates.data?.some((u) => u.version === version) && <option value={version}>{version}</option>}
          {updates.data?.map((u) => (
            <option key={u.version} value={u.version}>
              {u.version}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
