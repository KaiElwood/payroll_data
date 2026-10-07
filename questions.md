# Questions for a production manager or client

## Reporting scope

- Who reviews the dashboard, and which decisions should the first screen support?
- If we want to make this more PWA-specific, what are the state, county, worksite, applicable wage determination or New York schedule, and effective dates?
- Who approves occupation/level mappings?
- If we were to add in a wage table to compare to, who supplies its authoritative version?
- Should totals include cash wages only or the listed benefits rate? What does `benefits_rate` represent?
- Is this one project and contractor? The CSV lacks both identifiers; the prototype assumes one of each.

## Data interpretation

- Can an employee have multiple occupation, level, or rate lines in one week? Based on m y understanding of PWA compliance yes, but how should split hours and rates enter statistical review? Not currently a problem with the CSV but could be in future.
- Relatedly: should a combined-hours flag appear under every contributing occupation/level filter? It currently does.
- Are name changes for one ID expected? Would think not -- currently brings up flag.
- Are rate changes expected, and which effective dates or negotiated schedules govern them?
- Should overtime follow project rules or only the reported hours and rates? For example if we see 10 hours of normal work time, should we reclassify as 8 normal 2 overtime?
- Should peer hours use the same occupation/level and include zero-hour reports? The prototype does both.

## Review rules

- Which daily and weekly hour thresholds fit this project? Are long shifts expected? Currently we're using 60 hours a week and 16 hours a day as threshold flags. 
- Should unusual rates be compared with employee history, same occupation/level peers, or an approved schedule?
- Right now we're using five comparison weeks as the minimum for statistical review. Is that accurate?
- Should 2.5 standard deviations be considered abnormal or do hours fluctuate that much? 
- Should reviewers mark flags expected, corrected, or unresolved? Where should decisions be recorded?

## Database and service handoff

- Should corrected imports replace the dataset or remain as snapshots?
- Can multiple lines share an employee, week, and day?
- What should we do in instances where spelling varies across the same ID, like 1015, 1017, and 1021? 
- Are IDs stable across contractors and projects?
- What import audit data and retention are required? Should reviewers see failed imports?
- Where will the server run, and what authentication, backups, and audit logs are required? (I'm currently running this locally and serving the csv backend at the publicly available route).
