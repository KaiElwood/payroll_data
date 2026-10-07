# Questions for a production manager or client

## Reporting scope

- Who is the primary reviewer: project manager, payroll specialist, or compliance lead? Which decisions should the first screen help them make?
- What is the precise project location (state, county, and worksite) and which wage determination or New York schedule applies? What are its effective dates? (PWA-specific)
- Who approves the mapping from CSV occupations and levels to wage-table classifications? Are apprentice rates conditional on registration or program details not present here?
- If we add a selectable wage table, should it be a scenario comparison or a formal compliance review, and who supplies the authoritative table version?
- Should totals represent cash wages only, or cash wages plus the hourly benefits rate? Does `benefits_rate` mean paid benefits, a required fringe amount, or something else?
- Is this one project and one contractor? The CSV has no project, contractor, location, or work classification code beyond occupation and level.
    - Assuming one project and one contractor

## Data interpretation

- Is each employee expected to have exactly one record per week? Can an employee work multiple occupations or levels within a week?
- Are name changes for one employee ID expected (for example, preferred names or data-entry corrections)? Which field is the authoritative identity?
- Are rate changes during the period expected? Are there effective dates or negotiated schedules we should use when judging them?
- Does overtime follow any project-specific rule, or should we only report the hours and rates provided in the file?
- For employee daily-hour summaries, should the minimum and average include zero-hour days, or only days worked? The prototype uses active days for those two measures.

## Review rules

- What weekly and daily hour thresholds should prompt review? Are long shifts expected on this project?
- Should unusual pay rates be compared with an employee's own history, peers in the same occupation and level, or an approved wage schedule?
- How many observations are enough before a standard-deviation score is useful, and should we still show absolute guardrails for small samples?
- Is a 2.5-standard-deviation cue with five comparison weeks a useful review workload, or should thresholds vary by trade, season, or payroll policy?
- When an employee's other weeks all have the same rate, should a material change be flagged automatically or held until an approved rate schedule is checked?
- Should reviewers be able to mark a flag as expected, corrected, or unresolved? Where would those decisions be recorded in a production version?
