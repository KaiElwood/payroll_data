# Build schedule

Each commit produces a runnable step and builds on the previous one.

1. **Plumbing:** Vite, React, TypeScript, local-only app shell, and project questions.
2. **Data model:** Parse the committed CSV, validate fields, and calculate payroll and hour metrics.
3. **Overview:** Filterable summary cards and weekly workforce/payroll trends.
4. **Employees:** Searchable employee statistics and drill-down into weekly records.
5. **Review queue:** Explainable data quality flags, including standard-deviation-based comparisons where sample size supports them.
6. **Handoff:** Responsive polish, focused verification, and README assumptions and tradeoffs.
7. **Employee analysis:** Show weekly standard and overtime hours, combined split records, and the latest two reported weeks side by side. React renders the chart and D3 scales place its bars and grid.
8. **Static deployment:** Build and test on pushes to `main`, then publish the client-side app through GitHub Pages.
9. **Local data service:** Import the CSV into versioned SQLite tables, serve filtered read endpoints, and allow an opt-in React development mode to fetch rows. Keep the public Pages build on the committed CSV until server deployment is planned.
10. **Future comparison mode:** Let a reviewer choose an authoritative wage table (for example, a New York table), map its locality, effective date, trade, and worker level to CSV records, then compare rates and benefits. Keep results provisional until project location and classification inputs are confirmed.

The scope is a client-side reporting prototype. A flag asks for human review; it does not assert legal compliance or an actual payroll error.

Keep each implementation commit near 200 hand-written lines. Generated lockfile changes may be larger.
