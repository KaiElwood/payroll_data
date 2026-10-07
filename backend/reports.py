"""Employee history and comparison reports built from the API row contract."""

import sqlite3
from collections import defaultdict

from backend.queries import rows, summarize, weekly


def _employee_week(week: str, lines: list[dict]) -> dict:
    summary = summarize(lines)
    return {
        "weekEnding": week,
        "standardHours": round(summary["totalHours"] - summary["overtimeHours"], 2),
        "overtimeHours": summary["overtimeHours"],
        "totalHours": summary["totalHours"],
        "cashWages": summary["cashWages"],
        "records": len(lines), "lines": lines,
    }


def meta(db: sqlite3.Connection) -> dict:
    from backend.queries import options

    batch = db.execute("SELECT * FROM import_batches LIMIT 1").fetchone()
    return {
        "sourceName": batch["source_name"] if batch else None,
        "sourceSha256": batch["sha256"] if batch else None,
        "importedAt": batch["imported_at"] if batch else None,
        "records": batch["row_count"] if batch else 0,
        "employees": db.execute("SELECT COUNT(*) FROM employees").fetchone()[0],
        "weeks": db.execute("SELECT COUNT(DISTINCT week_ending) FROM employee_weeks").fetchone()[0],
        "options": options(db),
    }


def employee_directory(db: sqlite3.Connection, filters: dict | None = None) -> list[dict]:
    groups = defaultdict(list)
    for row in rows(db, filters):
        groups[row["employeeId"]].append(row)
    result = []
    for employee_id, group in groups.items():
        latest = max(group, key=lambda row: (row["weekEnding"], row["sourceRow"]))
        total = summarize(group)
        result.append({
            "employeeId": employee_id, "name": latest["employeeName"],
            "level": latest["level"], "occupation": latest["occupation"],
            "weeks": len({row["weekEnding"] for row in group}),
            "totalHours": total["totalHours"], "overtimeHours": total["overtimeHours"],
            "cashWages": total["cashWages"],
        })
    return sorted(result, key=lambda item: (item["name"], item["employeeId"]))


def employee_detail(db: sqlite3.Connection, employee_id: str, filters: dict | None = None) -> dict | None:
    selected = rows(db, {**(filters or {}), "employeeId": employee_id})
    if not selected:
        exists = db.execute("SELECT 1 FROM employees WHERE employee_id = ?", (employee_id,)).fetchone()
        if not exists:
            return None
    latest = max(selected, key=lambda row: (row["weekEnding"], row["sourceRow"])) if selected else None
    groups = defaultdict(list)
    for row in selected:
        groups[row["weekEnding"]].append(row)
    return {
        "employeeId": employee_id,
        "name": latest["employeeName"] if latest else None,
        "level": latest["level"] if latest else None,
        "occupation": latest["occupation"] if latest else None,
        "summary": summarize(selected),
        "weeks": [_employee_week(week, groups[week]) for week in sorted(groups)],
    }


def weekly_comparisons(db: sqlite3.Connection, filters: dict | None = None) -> list[dict]:
    selected = rows(db, filters)
    return [{
        "weekEnding": week["weekEnding"],
        "totalHours": week["totalHours"],
        "overtimeHours": week["overtimeHours"],
        "overtimeShare": week["overtimeHours"] / week["totalHours"] if week["totalHours"] else 0,
        "apprenticeHours": week["apprenticeHours"],
        "journeyworkerHours": round(week["totalHours"] - week["apprenticeHours"], 2),
    } for week in weekly(selected)]


def employee_comparison(db: sqlite3.Connection, employee_id: str,
                        filters: dict | None = None) -> dict | None:
    selected = rows(db, filters)
    own = [row for row in selected if row["employeeId"] == employee_id]
    if not own:
        if not db.execute("SELECT 1 FROM employees WHERE employee_id = ?", (employee_id,)).fetchone():
            return None
        return {"employeeId": employee_id, "peerWeeks": [], "latestTwo": None}
    latest_line = max(own, key=lambda row: (row["weekEnding"], row["sourceRow"]))
    level, occupation = latest_line["level"], latest_line["occupation"]
    cohort = [row for row in selected if row["level"] == level and row["occupation"] == occupation]
    own_weeks = defaultdict(list)
    for row in cohort:
        if row["employeeId"] == employee_id:
            own_weeks[row["weekEnding"]].append(row)
    points = []
    for week in sorted(own_weeks):
        peer_totals = defaultdict(float)
        for row in cohort:
            if row["weekEnding"] == week and row["employeeId"] != employee_id:
                peer_totals[row["employeeId"]] += row["totalHours"]
        peer_total = round(sum(peer_totals.values()), 2)
        count = len(peer_totals)
        points.append({
            "weekEnding": week,
            "employeeHours": round(sum(row["totalHours"] for row in own_weeks[week]), 2),
            "peerTotalHours": peer_total,
            "peerCount": count,
            "peerAverage": peer_total / count if count else None,
        })
    weeks = weekly(own)
    latest_two = None
    if len(weeks) >= 2:
        previous, current = weeks[-2:]
        latest_two = {
            "current": current, "previous": previous,
            "hoursChange": round(current["totalHours"] - previous["totalHours"], 2),
            "overtimeChange": round(current["overtimeHours"] - previous["overtimeHours"], 2),
            "wagesChange": round(current["cashWages"] - previous["cashWages"], 4),
        }
    return {"employeeId": employee_id, "level": level, "occupation": occupation,
            "peerWeeks": points, "latestTwo": latest_two}
