# Questions for a production manager or client

## Reporting scope

- Who is the primary reviewer: project manager, payroll specialist, or compliance lead? Which decisions should the first screen help them make?
- Does “PWA” mean prevailing wage and apprenticeship reporting here, and which jurisdiction and program apply?
- Should totals represent cash wages only, or cash wages plus the hourly benefits rate? Does `benefits_rate` mean paid benefits, a required fringe amount, or something else?
- Is this one project and one contractor? The CSV has no project, contractor, location, or work classification code beyond occupation and level.

## Data interpretation

- Is each employee expected to have exactly one record per week? Can an employee work multiple occupations or levels within a week?
- Are name changes for one employee ID expected (for example, preferred names or data-entry corrections)? Which field is the authoritative identity?
- Are rate changes during the period expected? Are there effective dates or negotiated schedules we should use when judging them?
- Does overtime follow any project-specific rule, or should we only report the hours and rates provided in the file?

## Review rules

- What weekly and daily hour thresholds should prompt review? Are long shifts expected on this project?
- Should unusual pay rates be compared with an employee's own history, peers in the same occupation and level, or an approved wage schedule?
- How many observations are enough before a standard-deviation score is useful, and should we still show absolute guardrails for small samples?
- Should reviewers be able to mark a flag as expected, corrected, or unresolved? Where would those decisions be recorded in a production version?
