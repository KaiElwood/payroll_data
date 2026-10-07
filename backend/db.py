"""Validate and atomically load a payroll CSV into a local SQLite database."""

import csv
import hashlib
import io
import sqlite3
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path


DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
REQUIRED = (
    "employee_name", "employee_id", "level", "occupation", "week_ending",
    *(f"{day}_{kind}_hours" for kind in ("st", "ot") for day in DAYS),
    "standard_rate", "overtime_rate", "benefits_rate",
)
SCHEMA = Path(__file__).with_name("schema.sql")


def connect(path: str | Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    version = connection.execute("PRAGMA user_version").fetchone()[0]
    if version != 0 and version != 1:
        connection.close()
        raise ValueError(f"Unsupported database schema version {version}")
    if version == 0:
        connection.executescript(SCHEMA.read_text())
        connection.execute("PRAGMA user_version = 1")
    return connection


def _hundredths(raw: str | None, field: str, row_number: int) -> int:
    try:
        value = Decimal(raw or "")
        scaled = value * 100
        if not value.is_finite() or value < 0 or scaled != scaled.to_integral_value():
            raise ValueError
        return int(scaled)
    except (InvalidOperation, ValueError) as error:
        raise ValueError(f"Invalid {field} on CSV row {row_number}") from error


def _week(raw: str | None, row_number: int) -> str:
    try:
        if raw is None or len(raw) != 10 or raw[2] != "/" or raw[5] != "/":
            raise ValueError
        return datetime.strptime(raw, "%m/%d/%Y").date().isoformat()
    except ValueError as error:
        raise ValueError(f"Invalid week_ending on CSV row {row_number}") from error


def parse_csv(contents: bytes) -> list[dict]:
    try:
        reader = csv.DictReader(io.StringIO(contents.decode("utf-8-sig"), newline=""))
        headers = reader.fieldnames or []
        if len(headers) != len(set(headers)):
            raise ValueError("Duplicate CSV columns")
        missing = set(REQUIRED) - set(headers)
        if missing:
            raise ValueError(f"Missing CSV columns: {', '.join(sorted(missing))}")
        parsed = []
        # Logical record number matches the existing React rowNumber convention.
        for row_number, raw in enumerate(reader, start=2):
            if None in raw:
                raise ValueError(f"Extra CSV fields on row {row_number}")
            employee_id = (raw["employee_id"] or "").strip()
            name = (raw["employee_name"] or "").strip()
            level = (raw["level"] or "").strip()
            occupation = (raw["occupation"] or "").strip()
            if not employee_id or not name or not occupation:
                raise ValueError(f"Missing identity on CSV row {row_number}")
            if level not in ("APPRENTICE", "JOURNEYWORKER"):
                raise ValueError(f"Invalid level on CSV row {row_number}")
            hours = [
                (_hundredths(raw[f"{day}_st_hours"], f"{day}_st_hours", row_number),
                 _hundredths(raw[f"{day}_ot_hours"], f"{day}_ot_hours", row_number))
                for day in DAYS
            ]
            parsed.append({
                "source_row": row_number, "employee_id": employee_id,
                "source_name": name, "level": level, "occupation": occupation,
                "week_ending": _week((raw["week_ending"] or "").strip(), row_number),
                "hours": hours,
                "rates": tuple(_hundredths(raw[f"{kind}_rate"], f"{kind}_rate", row_number)
                               for kind in ("standard", "overtime", "benefits")),
            })
        if not parsed:
            raise ValueError("CSV has no payroll rows")
        return parsed
    except UnicodeDecodeError as error:
        raise ValueError("CSV must be UTF-8") from error


def import_csv(connection: sqlite3.Connection, source: str | Path) -> dict:
    source = Path(source)
    contents = source.read_bytes()
    digest = hashlib.sha256(contents).hexdigest()
    existing = connection.execute("SELECT id, sha256 FROM import_batches LIMIT 1").fetchone()
    if existing and existing["sha256"] == digest:
        return {"changed": False, "batchId": existing["id"]}
    rows = parse_csv(contents)  # Validate everything before replacing current records.
    with connection:
        connection.execute("DELETE FROM employees")
        connection.execute("DELETE FROM import_batches")
        batch_id = connection.execute(
            "INSERT INTO import_batches(source_name, sha256, imported_at, row_count) VALUES (?, ?, ?, ?)",
            (source.name, digest, datetime.now(timezone.utc).isoformat(), len(rows)),
        ).lastrowid
        for row in rows:
            connection.execute("INSERT OR IGNORE INTO employees VALUES (?)", (row["employee_id"],))
            connection.execute(
                "INSERT OR IGNORE INTO employee_weeks(employee_id, week_ending) VALUES (?, ?)",
                (row["employee_id"], row["week_ending"]),
            )
            week_id = connection.execute(
                "SELECT id FROM employee_weeks WHERE employee_id = ? AND week_ending = ?",
                (row["employee_id"], row["week_ending"]),
            ).fetchone()["id"]
            line_id = connection.execute(
                """INSERT INTO pay_lines(employee_week_id, batch_id, source_row, source_name,
                   level, occupation, standard_rate_cents, overtime_rate_cents, benefits_rate_cents)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (week_id, batch_id, row["source_row"], row["source_name"], row["level"],
                 row["occupation"], *row["rates"]),
            ).lastrowid
            connection.executemany(
                "INSERT INTO day_hours VALUES (?, ?, ?, ?)",
                ((line_id, index, standard, overtime)
                 for index, (standard, overtime) in enumerate(row["hours"])),
            )
    return {"changed": True, "batchId": batch_id, "records": len(rows)}
