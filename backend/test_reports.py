import tempfile
import unittest
from pathlib import Path

from backend.db import connect, import_csv
from backend.queries import overview, rows
from backend.reports import employee_comparison, employee_detail, employee_directory


SOURCE = Path(__file__).resolve().parents[1] / "payroll_data (3).csv"


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.db = connect(Path(self.folder.name) / "test.sqlite")
        self.addCleanup(self.db.close)
        import_csv(self.db, SOURCE)

    def test_filtered_totals_and_no_matches(self):
        apprentice = overview(self.db, {"level": "APPRENTICE"})["summary"]
        self.assertEqual(apprentice["records"], 59)
        self.assertEqual(apprentice["apprenticeShare"], 1)
        missing = overview(self.db, {"weekEnding": "2026-01-01"})
        self.assertEqual(missing["summary"]["records"], 0)
        self.assertEqual(missing["weekly"], [])
        with self.assertRaisesRegex(ValueError, "Invalid weekEnding"):
            rows(self.db, {"weekEnding": None})

    def test_employee_history_and_peer_denominator(self):
        self.assertEqual(len(employee_directory(self.db)), 23)
        detail = employee_detail(self.db, "1000")
        self.assertEqual(len(detail["weeks"]), 14)
        self.assertIsNone(employee_detail(self.db, "missing"))
        no_peers = employee_comparison(self.db, "1000")
        self.assertEqual(no_peers["peerWeeks"][0]["peerCount"], 0)
        self.assertIsNone(no_peers["peerWeeks"][0]["peerAverage"])
        peers = employee_comparison(self.db, "1009")["peerWeeks"]
        self.assertTrue(any(point["peerCount"] == 4 for point in peers))
        self.assertTrue(all(point["peerAverage"] == point["peerTotalHours"] / point["peerCount"]
                            for point in peers if point["peerCount"]))


if __name__ == "__main__":
    unittest.main()
