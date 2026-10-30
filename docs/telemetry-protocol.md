# Recording sessions for measured tyres and fuel

How to record laps with gt7-telemetry (the owner's telemetry recorder, not public yet) so they show up as **Measured** on the car page
(ADR 7). Sessions that break these rules are skipped by the export, with the reason.

1. **Custom lobby** (or any race where you control the settings): **fuel consumption x1** and **tyre wear x1**.
   Time Trial and most Daily Races use other multipliers and are skipped.
2. Note the **tyre compound** and keep it for the whole run.
3. Record with the multipliers given:
   `uv run gt7 record --ps5 <PS5 IP> --track <track> --tyres <compound> --fuel-mult 1 --wear-mult 1`
4. Drive **8–10 laps in a row without pitting**. At least 5 clean laps are needed; the grip indicator uses the laps
   from lap 2 until the first pit stop.
5. One session per car, track and compound. More sessions of the same combination are combined (median).
6. Export into this repo and check it:
   `uv run gt7 export-measurements --out ../bop-radar/data/measured.json`, then in bop-radar `uv run gt7bop check`.
7. Commit `data/measured.json`. The next build adds the values to the car pages.

What the numbers mean: **fuel** is the share of the tank used per lap at x1 (measured). **Grip** is how much the
cornering grip (the g-g envelope of each lap) fell per lap, an indicator of tyre wear, because GT7 does not send wear.
