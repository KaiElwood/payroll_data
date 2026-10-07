# Local payroll data service

## Source and boundaries

`payroll_data (3).csv` is an import source, not a live database. Its 263 rows cover
23 employee IDs and 15 week-ending dates (2025-03-01 through 2025-06-07). Today
there is one source row per employee/week, but the model accepts several pay lines
in a week. Three IDs have different names across rows. Preserve the source spelling
on each line; the latest reported spelling is only a display name, not a correction.

The local service uses Python's standard library and SQLite. It does not change the
existing static deployment. A server deployment needs its own hosting, access
controls, backup policy, and a decision about exposing payroll data.

## Schema, version 1

| Table | Key and relevant columns | Purpose |
| --- | --- | --- |
| `import_batches` | `id`, `source_name`, `sha256`, `imported_at`, `row_count` | Identify an exact input; the hash makes repeat imports idempotent. |
| `employees` | `employee_id` (text primary key) | Keep IDs as source strings, including possible leading zeroes. |
| `employee_weeks` | `id`, `employee_id`, `week_ending` (ISO date), unique pair | Group split lines into one reporting week. |
| `pay_lines` | `id`, `employee_week_id`, `batch_id`, `source_row`, `source_name`, `level`, `occupation`, `standard_rate_cents`, `overtime_rate_cents`, `benefits_rate_cents` | Preserve every CSV row's classification, rates, name, and provenance. Unique `(batch_id, source_row)`. |
| `day_hours` | `pay_line_id`, `day_index` (0 = Monday), `standard_hundredths`, `overtime_hundredths`; unique pair | Keep all seven source days on each line, including zeroes. |

Hours use integer hundredths and rates use integer cents. CSV values are parsed as
decimal numbers; negative values and precision finer than two decimals are rejected.
The current CSV has one decimal place for hours and two for rates. Derived wages are
calculated from line hours and rates, with rounding to cents only when serialized
for display. Benefits remain a separate estimate. After idempotent schema setup,
the data replacement is one transaction. An identical SHA-256
is a no-op; importing changed source content replaces the dataset atomically, so
stale weeks and lines do not survive. Original CSV files are never modified.

## Read API, version 1

Local-only HTTP on `127.0.0.1`, JSON responses, ISO `YYYY-MM-DD` week dates.
Common optional filters are `weekEnding`, `level`, and `occupation`; invalid values
produce HTTP 400. Totals are computed *after* filtering pay lines. `employeeId` is
also accepted on overview, weekly summaries, and rows. No paging is needed for the
current 263 lines; add it before importing materially larger files.

| Endpoint | Response |
| --- | --- |
| `GET /api/v1/meta` | `sourceName`, `sourceSha256`, `importedAt`, `records`, `employees`, `weeks`, and filter options. |
| `GET /api/v1/rows` | Source-ordered row objects matching the React `PayrollRow` fields, with `weekEnding` as ISO date and `weekDate` derived in the client. Each row includes `batchId`, `sourceRow`, and seven-day hour arrays. |
| `GET /api/v1/overview` | Filtered `Overview` totals and chronological `weekly` summaries. Each week has distinct employee count and line count. |
| `GET /api/v1/employees` | Directory summaries by employee ID, with latest source name, classification, total/overtime hours, cash wages, and number of distinct weeks. |
| `GET /api/v1/employees/{employeeId}` | Employee summary and chronological `weeks`; each week includes combined standard/overtime hours, cash wages, and its source pay lines. |
| `GET /api/v1/comparisons/weekly` | Chronological series of overtime share and apprentice/journeyworker hours with explicit numerator and denominator. |
| `GET /api/v1/employees/{employeeId}/comparison` | Latest two *reported* weeks, their hours/overtime/wage differences, and same occupation/level peer hours for each week. Peer mean denominator is distinct peer employee-weeks and excludes the selected employee. |

No endpoint makes a compliance finding. Empty filters return zero totals and empty
series. Missing employee IDs return 404. A week with no peer rows returns a `null`
peer mean and zero peer count. `GET /api/v1/health` reports database readiness.

## React integration and deployment

The existing React calculations remain usable while the service is local. After
the JSON shape is verified, a local development setting can fetch `/api/v1/rows`
and map ISO dates into `Date` values. The public build continues to bundle the CSV
until an authenticated server deployment, secure data path, and migration plan are
approved. Avoid shipping a production API URL or silently falling back when an
explicit local API setting fails.
