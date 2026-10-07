# Questions for a production manager or client

## Reporting scope

- Who reviews the dashboard, and which decisions should the first screen support?
- What are the state, county, worksite, applicable wage determination or New York schedule, and effective dates? (PWA-specific)
- Who approves occupation/level mappings? Do apprentice rates depend on registration or program details?
- Is a selectable wage table for scenario comparison or formal review? Who supplies its authoritative version?
- Should totals include cash wages only or the listed benefits rate? What does `benefits_rate` represent?
- Is this one project and contractor? The CSV lacks both identifiers; the prototype assumes one of each.

## Data interpretation

- Can an employee have multiple occupation, level, or rate lines in one week? How should split hours and rates enter statistical review? The prototype suppresses split-week statistical flags.
- Should a combined-hours flag appear under every contributing occupation/level filter? It currently does.
- Are name changes for one ID expected, and which identity field is authoritative?
- Are rate changes expected, and which effective dates or negotiated schedules govern them?
- Should overtime follow project rules or only the reported hours and rates?
- Should daily minimum and average include zero-hour days? The prototype uses worked days.
- Do missing calendar weeks mean no work or missing data? Should comparisons use the latest two reported weeks or show a gap?
- Should peer hours use the same occupation/level and include zero-hour reports? The prototype does both.

## Review rules

- Which daily and weekly hour thresholds fit this project? Are long shifts expected?
- Should unusual rates be compared with employee history, same occupation/level peers, or an approved schedule?
- Are five comparison weeks and 2.5 standard deviations useful? Should thresholds vary by trade, season, or policy? Should absolute guardrails cover small samples?
- If all other weeks have the same rate, should a material change be flagged or await an approved schedule?
- Should reviewers mark flags expected, corrected, or unresolved? Where should decisions be recorded?

## Database and service handoff

- Should corrected imports replace the dataset or remain as snapshots? Who chooses the current one?
- Can multiple lines share an employee, week, and day? What makes a true duplicate?
- Which spelling should display for IDs 1015, 1017, and 1021? Are IDs stable across contractors and projects?
- Where should payroll amounts round: source line, employee/week, or display total? The service rounds only for display.
- What import audit data and retention are required? Should reviewers see failed imports?
- Who can view names and wages? Where will the server run, and what authentication, backups, and audit logs are required?
