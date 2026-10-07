# Payroll reporting prototype

A client-side React and TypeScript dashboard for a local construction payroll CSV. It helps a project manager scan workforce and wage patterns, inspect employee history, and triage records that merit review.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite. The CSV is imported at build time from `payroll_data (3).csv`; no API, database, or server-side payroll processing is involved.

```bash
npm test
npm run build
```

## What the dashboard shows

- **Overview:** Cash wages, reported hours, overtime, unique employees, apprentice hour share, weekly wage spend, estimated benefits value, and the latest week.
- **Employees:** Searchable employee directory with daily-hour statistics, hourly rate ranges, combined weekly hour trends, a comparison of the latest two reported weeks, and source records.
- **Review queue:** Long-day and long-week guardrails, unusual employee-specific hours and rates, and employee-ID/name inconsistencies. Shared level, occupation, and week filters apply to all views.

## Calculation choices

- Cash wages = standard hours × standard rate + overtime hours × overtime rate, summed across rows.
- Estimated benefits value = total reported hours × listed benefits rate. It is shown separately because the file does not say whether this rate means paid benefits, a required fringe, or another amount.
- Apprentice share = hours on apprentice rows ÷ all reported hours.
- Average rate in an employee view is the simple mean of that employee's weekly row rates. Daily minimum and average use days with reported work; maximum includes all recorded days.
- Each record is compared with **other weeks for the same employee**. Statistical review requires five distinct comparison weeks, a difference of at least 2.5 population standard deviations, and a material difference: 10 hours for weekly hours, $2/hour for standard or overtime wages, or $1/hour for benefits. Rate flags also require a 10% difference. If all comparison weeks have the same value, a material change can still be flagged.
- Separate guardrails flag more than 60 hours in a week or 16 hours in a day. When an employee has multiple records in a week, their hours are combined for these guardrails and the flag is linked to every contributing record. Statistical flags are suppressed for a split candidate week until its interpretation is clarified.

These thresholds are **review cues**, not proof of an error, underpayment, or legal noncompliance. The queue shows the measured value, reason, employee, week, and CSV row for each cue.

## Priorities and tradeoffs

The build favors a clear local-data workflow and explainable calculations over a backend, upload flow, or regulatory verdict. The CSV has 263 records for 23 employees across 15 weeks, but no project location, wage determination, approved classification mapping, apprentice registration, or effective-date schedule. Those omissions prevent a meaningful prevailing wage or apprenticeship compliance finding.

The next product step is a **selectable wage-table comparison**. A reviewer could choose an authoritative table, including a New York example, then supply the relevant locality, effective date, and occupation/level mapping. Results should remain provisional until those inputs and the table version are confirmed.

The charts use React-rendered SVG elements and D3 scales for placement. GitHub Pages builds from `main` through `.github/workflows/deploy.yml`; the public site includes the committed payroll CSV in its client-side bundle.

Open product and data questions are tracked in [questions.md](questions.md). The incremental build sequence is in [ROADMAP.md](ROADMAP.md).
