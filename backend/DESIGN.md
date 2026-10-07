# Local payroll data service

## Source and boundaries

`payroll_data (3).csv` has 263 rows, 23 employee IDs, and 15 week-ending dates
(2025-03-01 through 2025-06-07). The model allows multiple pay lines per employee/week,
although the current file has one. Three IDs have varying names; preserve each source
spelling and use the latest only for display.

The local service uses Python's standard library and SQLite without changing static
deployment. Server deployment requires hosting, access controls, backups, and a
decision on payroll data exposure.

## Schema, version 1

| Table | Key and relevant columns | Purpose |
| --- | --- | --- |
| `import_batches` | `id`, `source_name`, `sha256`, `imported_at`, `row_count` | Identify an exact input; the hash makes repeat imports idempotent. |
| `employees` | `employee_id` (text primary key) | Keep IDs as source strings, including possible leading zeroes. |
| `employee_weeks` | `id`, `employee_id`, `week_ending` (ISO date), unique pair | Group split lines into one reporting week. |
| `pay_lines` | `id`, `employee_week_id`, `batch_id`, `source_row`, `source_name`, `level`, `occupation`, `standard_rate_cents`, `overtime_rate_cents`, `benefits_rate_cents` | Preserve every parsed CSV record's classification, rates, name, and provenance. Unique `(batch_id, source_row)`. |
| `day_hours` | `pay_line_id`, `day_index` (0 = Monday), `standard_hundredths`, `overtime_hundredths`; unique pair | Keep all seven source days on each line, including zeroes. |

Hours use integer hundredths; rates use integer cents. Parsing rejects negative values
and precision beyond two decimals. Money is `hour_hundredths × rate_cents / 10000`
dollars. JSON retains up to four decimals; totals round only for display. Rounding
each line first changes this file's cash total by $0.21. Benefits are estimated separately.

After idempotent schema setup, a changed import replaces the dataset in one transaction;
an identical SHA-256 is a no-op. Source CSVs are untouched. SQLite `user_version` is 1;
unknown versions fail and future changes require migrations. `source_row`, API
`sourceRow`, and React `rowNumber` count logical CSV records (header = 1), which can
differ from physical lines with blank lines or multiline fields. The batch hash and
record number identify a source record.

## Read API, version 1

Local JSON HTTP binds to `127.0.0.1`; week dates use ISO `YYYY-MM-DD`. Optional
`weekEnding`, `level`, and `occupation` filters return HTTP 400 for invalid values.
Overview, weekly summaries, and rows also accept `employeeId`. Filter pay lines before
calculating totals. Add paging before importing materially larger files.

| Endpoint | Response |
| --- | --- |
| `GET /api/v1/meta` | `sourceName`, `sourceSha256`, `importedAt`, `records`, `employees`, `weeks`, and filter options. |
| `GET /api/v1/rows` | Source-ordered React numeric fields, ISO `weekEnding`, seven-day hour arrays, four-decimal money, and `rowNumber`/`batchId`/`sourceRow` provenance. The adapter converts dates to `MM/DD/YYYY` and UTC `weekDate`. |
| `GET /api/v1/overview` | Filtered `Overview` totals and chronological `weekly` summaries. Each week has distinct employee count and line count. |
| `GET /api/v1/employees` | Directory summaries by employee ID, with latest source name, classification, total/overtime hours, cash wages, and number of distinct weeks. |
| `GET /api/v1/employees/{employeeId}` | Employee summary and chronological `weeks`; each week includes combined standard/overtime hours, cash wages, and its source pay lines. |
| `GET /api/v1/comparisons/weekly` | Chronological series of overtime share and apprentice/journeyworker hours with explicit numerator and denominator. |
| `GET /api/v1/employees/{employeeId}/comparison` | Chronological same occupation/level peers and hours/overtime/wage differences between the latest two *reported* weeks. Points include `employeeHours`, `peerTotalHours`, `peerCount`, and nullable `peerAverage`; the denominator counts distinct peer employee-weeks and excludes the selected employee. |

No endpoint makes a compliance finding. Filters matching no pay lines return zero totals
and empty series. Missing employee IDs return 404. A week with no peer rows returns a `null`
peer mean and zero peer count. `GET /api/v1/health` reports database readiness.

## React integration and deployment

Local development proxies Vite `/api` to the loopback service with `changeOrigin: true`
and normalizes `/api/v1/rows` dates through the row adapter. The public build
bundles the CSV until an authenticated server, secure data path, and migration plan
are approved. Do not ship a production API URL or silently fall back when an explicit
local API setting fails.
