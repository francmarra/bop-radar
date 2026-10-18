# Backlog — live Daily Race guide & "chrome" style (2026-10-18)

Status: **saved, not implemented** (owner decision). Brainstorm/design before code when picked up.

## 1. Daily Race guide uses old metas

**Symptom.** "This week" shows cars from earlier metas. Week 42/2026, Race B (Spa, Gr.3): our top was
R8 LMS Evo '19 (1775 laps from an older Spa event), F-type Gr.3 (7 laps), 296 GT3 '23 (26 laps), then estimates.

**Root cause.**
- `src/gt7bop/leaderboards.py` `update()` skips running events:
  `if not ev.pop("final") or path.exists():  # running events are re-read once archived`.
- `src/gt7bop/week.py` `build_week()` only uses historical per-track ratings from `tracks.json`
  (`tracks.rate_combos`, 6-month half-life, BoP-staleness weight), so the current week is never reflected.
- Last stored event at diagnosis: 2026-10-05. The Action runs Mon/Thu only.

**Evidence.**
- gtsh-rank `/daily/` lists the current boards as Running: `p_rt_1014978_001` (Spa Gr.3),
  `p_rt_1014979_001` (Sardegna Road B Gr.4); live paging API works for them.
- DG-Edge (`https://www.dg-edge.com/events/dailies`, Week 42 Race B): live "most used cars" in the top 5,000 —
  Genesis Gr.3 22.35 %, Jaguar F-type Gr.3 14.66 %, Ferrari 296 GT3 '23 12.18 %; fastest lap Toyota GR Supra
  Racing Concept '18; top-100 2:17.264, top-1000 2:18.184; 76,817 players. Updated several times a day.

**Proposed fix (branch `fix/live-week`).**
1. `gt7bop leaderboards` also reads running events (top 1000, aggregates only) into
   `data/leaderboards/live/<board>.json`, overwritten each run; never used by `rate_combos`/`evaluate`;
   the final archived event is stored as today.
2. `build_week`: for "this" week, if live data for the race exists, top 5 = live pace order, each car labelled
   "This week: X % of top 1000 · N laps"; otherwise historical with "Based on earlier races". "Next" week stays
   historical.
3. Daily cron 06:00 UTC that only refreshes live leaderboards + guide + deploy (GT ENG!NE BoP stays Mon/Thu;
   ~10 extra requests/day to gtsh-rank with 2 s pauses).
4. Tests: live preferred when present, fallback otherwise, live never enters history/backtest, EN/PT labels;
   compare the Spa top with DG-Edge after deploy.

## 2. Style ideas — Pinterest references

Pins: <https://pt.pinterest.com/pin/840132505512717378/> (Armored Core design book) ·
<https://pt.pinterest.com/pin/1005287948090230164/> (JDM WORK wheels poster) ·
<https://pt.pinterest.com/pin/1103593083712032147/> (chrome vinyl) ·
<https://pt.pinterest.com/pin/1134907174874647358/> (chrome star).

**Shared language:** deep black, monochrome/chrome, high contrast, lots of negative space, one hero object,
hard light with reflections and a hint of prism/rainbow.

- Armored Core art book: sepia/desaturated palette, editorial grid (big image + thumbnail column), technical
  uppercase titles with tracking, small text blocks, hairline rules.
- JDM poster: film-grain photo, vertical Japanese type, bracketed labels `[ドリフト]`, inset thumbnail with a
  thin border, serif/sans mix.
- Chrome vinyl / star: glowing metallic 3D object on black, white glow + chromatic aberration, tiny uppercase
  spec-sheet caption.

**How it could map to the site:**
- Car hero on pure black with a glow/reflection under the car (instead of red stripes).
- Subtle SVG-noise grain on the background.
- Section titles uppercase with wide tracking; bracket labels `[GR.3]` `[FAST]`.
- Small mono spec sheet beside the car (PS, kg, PS/t, PP).
- Car page as an editorial grid (large picture + BoP-version thumbnails).
- Optional decorative vertical text (desktop only, `aria-hidden`).
- Chrome/prism accent on the logo; red only as a minimal accent.
- Keep AA contrast, 18 px base text, `prefers-reduced-motion`, CLS ≤ 0.1.
