import csv
import tempfile
import unittest
from pathlib import Path

from backend.db import connect, import_csv


SOURCE = Path(__file__).resolve().parents[1] / "payroll_data (3).csv"


def altered_csv(path: Path, edit):
    with SOURCE.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        fields = reader.fieldnames
    edit(rows)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.path = Path(self.folder.name)
        self.db = connect(self.path / "test.sqlite")
        self.addCleanup(self.db.close)

    def count(self, table):
        return self.db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]

    def test_source_counts_and_idempotence(self):
        result = import_csv(self.db, SOURCE)
        self.assertEqual(result["records"], 263)
        self.assertEqual([self.count(table) for table in
                          ("employees", "employee_weeks", "pay_lines", "day_hours")],
                         [23, 263, 263, 1841])
        self.assertFalse(import_csv(self.db, SOURCE)["changed"])
        self.assertEqual(self.count("import_batches"), 1)

    def test_split_week_and_full_replacement(self):
        import_csv(self.db, SOURCE)
        changed = self.path / "changed.csv"
        altered_csv(changed, lambda rows: rows.append({**rows[0], "employee_name": "Corrected Name"}))
        import_csv(self.db, changed)
        self.assertEqual(self.count("pay_lines"), 264)
        self.assertEqual(self.count("employee_weeks"), 263)
        self.assertEqual(self.count("day_hours"), 1848)
        self.assertEqual(self.count("import_batches"), 1)
        self.assertEqual(self.db.execute(
            "SELECT COUNT(*) FROM pay_lines WHERE source_name = 'Corrected Name'"
        ).fetchone()[0], 1)

    def test_bad_replacement_preserves_current_data(self):
        import_csv(self.db, SOURCE)
        changed = self.path / "bad.csv"
        altered_csv(changed, lambda rows: rows[-1].update({"sun_ot_hours": "-1"}))
        with self.assertRaisesRegex(ValueError, "sun_ot_hours"):
            import_csv(self.db, changed)
        self.assertEqual(self.count("pay_lines"), 263)
        self.assertEqual(self.count("import_batches"), 1)

    def test_unknown_schema_version_is_rejected(self):
        self.db.execute("PRAGMA user_version = 2")
        with self.assertRaisesRegex(ValueError, "version 2"):
            connect(self.path / "test.sqlite")

    def test_source_row_is_logical_record_number(self):
        source = self.path / "with-blank-line.csv"
        contents = SOURCE.read_text()
        header, rest = contents.split("\n", 1)
        source.write_text(header + "\n\n" + rest)
        import_csv(self.db, source)
        self.assertEqual(self.db.execute("SELECT MIN(source_row) FROM pay_lines").fetchone()[0], 2)


if __name__ == "__main__":
    unittest.main()
