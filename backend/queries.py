"""Read models for the local payroll API; money is summed in 1/10000 dollars."""

import sqlite3
from collections import defaultdict


LEVELS = ("APPRENTICE", "JOURNEYWORKER")


def options(db: sqlite3.Connection) -> dict:
    return {
        "levels": list(LEVELS),
        "occupations": [row[0] for row in db.execute(
            "SELECT DISTINCT occupation FROM pay_lines ORDER BY occupation")],
        "weeks": [row[0] for row in db.execute(
            "SELECT DISTINCT week_ending FROM employee_weeks ORDER BY week_ending")],
    }


def validate_filters(db: sqlite3.Connection, filters: dict) -> None:
    from datetime import date

    allowed = {"weekEnding", "level", "occupation", "employeeId"}
    if set(filters) - allowed:
        raise ValueError(f"Unknown filter: {', '.join(sorted(set(filters) - allowed))}")
    if "level" in filters and filters["level"] not in LEVELS:
        raise ValueError("Invalid level")
    if "occupation" in filters and filters["occupation"] not in options(db)["occupations"]:
        raise ValueError("Invalid occupation")
    if "weekEnding" in filters:
        value = filters["weekEnding"]
        try:
            if date.fromisoformat(value).isoformat() != value:
                raise ValueError
        except ValueError as error:
            raise ValueError("Invalid weekEnding") from error


def rows(db: sqlite3.Connection, filters: dict | None = None) -> list[dict]:
    filters = filters or {}
    validate_filters(db, filters)
    clauses, values = [], []
    columns = {
        "weekEnding": "w.week_ending", "level": "p.level",
        "occupation": "p.occupation", "employeeId": "w.employee_id",
    }
    for key, value in filters.items():
        clauses.append(f"{columns[key]} = ?")
        values.append(value)
    where = "WHERE " + " AND ".join(clauses) if clauses else ""
    records = db.execute(f"""
        SELECT p.id, p.source_row, p.source_name, p.level, p.occupation,
               p.standard_rate_cents, p.overtime_rate_cents, p.benefits_rate_cents,
               w.employee_id, w.week_ending, p.batch_id,
               d.day_index, d.standard_hundredths, d.overtime_hundredths
        FROM pay_lines p
        JOIN employee_weeks w ON w.id = p.employee_week_id
        JOIN day_hours d ON d.pay_line_id = p.id
        {where}
        ORDER BY p.source_row, d.day_index
    """, values)
    result = []
    by_id = {}
    for record in records:
        line_id = record["id"]
        if line_id not in by_id:
            item = {
                "rowNumber": record["source_row"], "sourceRow": record["source_row"],
                "batchId": record["batch_id"], "employeeId": record["employee_id"],
                "employeeName": record["source_name"], "level": record["level"],
                "occupation": record["occupation"], "weekEnding": record["week_ending"],
                "standardHours": [0] * 7, "overtimeHours": [0] * 7,
                "_standardHundredths": 0, "_overtimeHundredths": 0,
                "_standardRateCents": record["standard_rate_cents"],
                "_overtimeRateCents": record["overtime_rate_cents"],
                "_benefitsRateCents": record["benefits_rate_cents"],
                "standardRate": record["standard_rate_cents"] / 100,
                "overtimeRate": record["overtime_rate_cents"] / 100,
                "benefitsRate": record["benefits_rate_cents"] / 100,
            }
            by_id[line_id] = item
            result.append(item)
        item = by_id[line_id]
        day = record["day_index"]
        item["standardHours"][day] = record["standard_hundredths"] / 100
        item["overtimeHours"][day] = record["overtime_hundredths"] / 100
        item["_standardHundredths"] += record["standard_hundredths"]
        item["_overtimeHundredths"] += record["overtime_hundredths"]
    for item in result:
        standard_hundredths = item.pop("_standardHundredths")
        overtime_hundredths = item.pop("_overtimeHundredths")
        standard_rate_cents = item.pop("_standardRateCents")
        overtime_rate_cents = item.pop("_overtimeRateCents")
        benefits_rate_cents = item.pop("_benefitsRateCents")
        standard = standard_hundredths / 100
        overtime = overtime_hundredths / 100
        item["totalStandardHours"] = standard
        item["totalOvertimeHours"] = overtime
        item["totalHours"] = round(standard + overtime, 2)
        item["cashWages"] = (standard_hundredths * standard_rate_cents +
                             overtime_hundredths * overtime_rate_cents) / 10000
        item["estimatedBenefits"] = ((standard_hundredths + overtime_hundredths) *
                                      benefits_rate_cents) / 10000
    return result


def summarize(records: list[dict]) -> dict:
    total_hours = sum(row["totalHours"] for row in records)
    apprentice = sum(row["totalHours"] for row in records if row["level"] == "APPRENTICE")
    count = len(records)
    return {
        "employees": len({row["employeeId"] for row in records}),
        "records": count,
        "totalHours": round(total_hours, 2),
        "overtimeHours": round(sum(row["totalOvertimeHours"] for row in records), 2),
        "apprenticeHours": round(apprentice, 2),
        "apprenticeShare": apprentice / total_hours if total_hours else 0,
        "cashWages": sum(round(row["cashWages"] * 10000) for row in records) / 10000,
        "estimatedBenefits": sum(round(row["estimatedBenefits"] * 10000) for row in records) / 10000,
        "averageStandardRate": sum(row["standardRate"] for row in records) / count if count else 0,
        "averageBenefitsRate": sum(row["benefitsRate"] for row in records) / count if count else 0,
    }


def weekly(records: list[dict]) -> list[dict]:
    groups = defaultdict(list)
    for row in records:
        groups[row["weekEnding"]].append(row)
    return [{"weekEnding": week, **summarize(groups[week])} for week in sorted(groups)]


def overview(db: sqlite3.Connection, filters: dict | None = None) -> dict:
    selected = rows(db, filters)
    return {"summary": summarize(selected), "weekly": weekly(selected)}
