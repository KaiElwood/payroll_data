# Build schedule

Each commit produces a runnable step and builds on the previous one.

1. **Plumbing:** Vite, React, TypeScript, local-only app shell, and project questions.
2. **Data model:** Parse the committed CSV, validate fields, and calculate payroll and hour metrics.
3. **Overview:** Filterable summary cards and weekly workforce/payroll trends.
4. **Employees:** Searchable employee statistics and drill-down into weekly records.
5. **Review queue:** Explainable data quality flags, including standard-deviation-based comparisons where sample size supports them.
6. **Handoff:** Responsive polish, focused verification, and README assumptions and tradeoffs.

The scope is a client-side reporting prototype. A flag asks for human review; it does not assert legal compliance or an actual payroll error.
