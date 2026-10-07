# Payroll reporting prototype

A React and TypeScript dashboard for scanning workforce and wage patterns, employee history, and records needing review. [View the live dashboard](https://www.kais.garden/payroll_data).

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. By default, the client imports `payroll_data (3).csv` at build time.

To use the local SQLite service, run these in separate terminals after `npm install`:

```bash
python3 -m backend import 'payroll_data (3).csv'
python3 -m backend serve
VITE_DATA_SOURCE=api npm run dev
```

The API listens on `127.0.0.1:8765`; Vite proxies `/api` in development. The GitHub Pages build still uses the bundled CSV. Reimporting the same file is a no-op; a changed CSV atomically replaces the local database records.

```bash
npm test
npm run build
```

For browser tests, install Chromium once with `npx playwright install chromium`, then run `npm run test:e2e`. Playwright serves the app locally using the committed CSV.

## What the dashboard shows

- **Overview:** Wages, hours, overtime, employee counts, apprentice share, weekly trends, and estimated benefits.
- **Employees:** Search, daily and weekly hours, rate ranges, the latest two reported weeks, and source records.
- **Review queue:** Long days or weeks, unusual hours or rates, and ID/name inconsistencies. Level, occupation, and week filters apply throughout.

## Calculation choices

- Cash wages = standard hours × standard rate + overtime hours × overtime rate, summed across rows.
- Estimated benefits value = total reported hours × listed benefits rate. It is shown separately because the file does not say whether this rate means paid benefits, a required fringe, or another amount.
- Apprentice share = hours on apprentice rows ÷ all reported hours.
- Employee average rate is the mean of weekly row rates. Daily minimum and average use worked days; maximum includes all recorded days.
- Statistical flags compare a record with **other weeks for the same employee**. They require five distinct comparison weeks, 2.5 population standard deviations, and a material difference: 10 weekly hours, $2/hour in wage rates, or $1/hour in benefits. Rate changes must also reach 10%. A material change can still be flagged when all comparison weeks match.
- Guardrails flag over 60 hours per week or 16 per day. Split records are combined for these checks and all contributing rows are linked. Statistical flags for split weeks are suppressed pending clarification.

Flags are **review cues**, not findings of error, underpayment, or noncompliance. Each shows its value, reason, employee, week, and CSV row.

## Priorities and tradeoffs

The CSV has 263 records for 23 employees across 15 weeks, but lacks project location, wage determination, approved classification mapping, apprentice registration, and effective dates. It cannot support a prevailing wage or apprenticeship compliance finding.

A proposed next step is **selectable wage-table comparison** using a confirmed table version, locality, effective date, and occupation/level mapping. Results would remain provisional until those inputs are verified.

Charts use React SVG and D3 scales. GitHub Pages builds from `main` via `.github/workflows/deploy.yml`; the garden app proxies `/payroll_data` and its assets to that deployment. The public bundle includes the committed payroll CSV.

See [questions.md](questions.md) for open questions, [ROADMAP.md](ROADMAP.md) for the build sequence, and [backend/DESIGN.md](backend/DESIGN.md) for the local service design.
