import { useId, useState } from "react";
import type { CarSummaryDto } from "../api/client";
import { useCarSearch } from "../api/queries";
import { useDebounced } from "../hooks/useDebounced";

const MAX_CARS = 4;

type Props = {
  selected: { id: string; label: string }[];
  onAdd(car: CarSummaryDto): void;
  onRemove(id: string): void;
};

export function CarPicker({ selected, onAdd, onRemove }: Props) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebounced(text, 250);
  const search = useCarSearch(debounced);
  const base = useId();
  const full = selected.length >= MAX_CARS;
  // Only show results for the text currently in the debounce window, never an older query's.
  const results = text === debounced ? (search.data ?? []) : [];
  const expanded = open && results.length > 0;
  const optionId = (i: number) => `${base}-opt-${i}`;

  function choose(car: CarSummaryDto) {
    if (selected.some((s) => s.id === car.id)) return;
    onAdd(car);
    setText("");
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!expanded) return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + results.length) % results.length);
    } else if (e.key === "Enter" && expanded && active >= 0) {
      e.preventDefault();
      choose(results[active]!);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="car-picker">
      <ul className="chips">
        {selected.map((s) => (
          <li key={s.id}>
            {s.label}
            <button type="button" aria-label={`Remove ${s.label}`} onClick={() => onRemove(s.id)}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <label htmlFor={`${base}-input`}>Search cars</label>
      <input
        id={`${base}-input`}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={`${base}-list`}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        disabled={full}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
      />
      {full && <p>Maximum 4 cars</p>}
      {expanded && (
        <ul id={`${base}-list`} role="listbox" aria-label="Search results">
          {results.map((car, i) => (
            <li
              key={car.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              aria-disabled={selected.some((s) => s.id === car.id) || undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(car)}
            >
              {car.name} · {car.maker} · {car.group}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
