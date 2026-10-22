import { useState } from "react";
import { useCompare } from "./api/queries";
import { CarPicker } from "./components/CarPicker";
import { CompareTable } from "./components/CompareTable";
import { Controls } from "./components/Controls";
import { Status } from "./components/Status";
import { useCompareParams } from "./state/useCompareParams";

export default function App() {
  const [params, update] = useCompareParams();
  // Names of picked cars, so chips show names (not ids) while the compare data loads.
  const [names, setNames] = useState<Record<string, string>>({});
  const compare = useCompare(params.ids, params.set, params.version);
  const label = (id: string) => compare.data?.cars.find((c) => c.id === id)?.name ?? names[id] ?? id;

  return (
    <main>
      <h1>BoP Radar — Compare</h1>
      <CarPicker
        selected={params.ids.map((id) => ({ id, label: label(id) }))}
        onAdd={(car) => {
          setNames((n) => ({ ...n, [car.id]: car.name }));
          update({ ids: [...params.ids, car.id] });
        }}
        onRemove={(id) => update({ ids: params.ids.filter((x) => x !== id) })}
      />
      <Controls set={params.set} version={params.version} onChange={update} />
      {params.ids.length < 2 ? (
        <p>Pick 2 to 4 cars to compare</p>
      ) : (
        <Status isLoading={compare.isLoading} error={compare.error} onRetry={() => void compare.refetch()}>
          {compare.data && <CompareTable data={compare.data} />}
        </Status>
      )}
    </main>
  );
}
