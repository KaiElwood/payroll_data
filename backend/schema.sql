PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS import_batches (
  id INTEGER PRIMARY KEY,
  source_name TEXT NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  imported_at TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0)
);

CREATE TABLE IF NOT EXISTS employees (
  employee_id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS employee_weeks (
  id INTEGER PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  week_ending TEXT NOT NULL,
  UNIQUE (employee_id, week_ending)
);

CREATE TABLE IF NOT EXISTS pay_lines (
  id INTEGER PRIMARY KEY,
  employee_week_id INTEGER NOT NULL REFERENCES employee_weeks(id) ON DELETE CASCADE,
  batch_id INTEGER NOT NULL REFERENCES import_batches(id),
  source_row INTEGER NOT NULL CHECK (source_row >= 2),
  source_name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('APPRENTICE', 'JOURNEYWORKER')),
  occupation TEXT NOT NULL,
  standard_rate_cents INTEGER NOT NULL CHECK (standard_rate_cents >= 0),
  overtime_rate_cents INTEGER NOT NULL CHECK (overtime_rate_cents >= 0),
  benefits_rate_cents INTEGER NOT NULL CHECK (benefits_rate_cents >= 0),
  UNIQUE (batch_id, source_row)
);

CREATE TABLE IF NOT EXISTS day_hours (
  pay_line_id INTEGER NOT NULL REFERENCES pay_lines(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  standard_hundredths INTEGER NOT NULL CHECK (standard_hundredths >= 0),
  overtime_hundredths INTEGER NOT NULL CHECK (overtime_hundredths >= 0),
  PRIMARY KEY (pay_line_id, day_index)
);

CREATE INDEX IF NOT EXISTS weeks_by_date ON employee_weeks(week_ending);
CREATE INDEX IF NOT EXISTS lines_by_class ON pay_lines(level, occupation);
