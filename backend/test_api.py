import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen
from urllib.request import Request

from backend.db import connect, import_csv
from backend.server import handler_for


SOURCE = Path(__file__).resolve().parents[1] / "payroll_data (3).csv"


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder = tempfile.TemporaryDirectory()
        cls.database = Path(cls.folder.name) / "payroll.sqlite"
        with connect(cls.database) as db:
            import_csv(db, SOURCE)
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler_for(cls.database))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.folder.cleanup()

    def get(self, path):
        with urlopen(self.base + path) as response:
            return json.load(response)

    def test_source_totals_and_row_precision(self):
        meta = self.get("/api/v1/meta")
        self.assertEqual((meta["records"], meta["employees"], meta["weeks"]), (263, 23, 15))
        lines = self.get("/api/v1/rows")["rows"]
        self.assertEqual(lines[0]["rowNumber"], 2)
        self.assertEqual(lines[0]["weekEnding"], "2025-03-01")
        self.assertEqual(lines[0]["cashWages"], 1163.172)
        self.assertEqual(sum(line["cashWages"] for line in lines), 429214.629)
        overview = self.get("/api/v1/overview")
        self.assertEqual(overview["summary"]["cashWages"], 429214.629)
        self.assertEqual(len(overview["weekly"]), 15)

    def test_filters_history_and_comparison(self):
        filtered = self.get("/api/v1/overview?level=APPRENTICE&weekEnding=2025-03-01")
        self.assertEqual(filtered["summary"]["apprenticeShare"], 1)
        employee = self.get("/api/v1/employees/1000")
        self.assertEqual(employee["employeeId"], "1000")
        self.assertEqual(len(employee["weeks"]), 14)
        comparison = self.get("/api/v1/employees/1000/comparison")
        self.assertEqual(len(comparison["peerWeeks"]), 14)
        self.assertIsNotNone(comparison["latestTwo"])
        self.assertEqual(len(self.get("/api/v1/comparisons/weekly")["weekly"]), 15)

    def test_error_statuses(self):
        for path, expected in [
            ("/api/v1/rows?level=UNKNOWN", 400),
            ("/api/v1/rows?level=APPRENTICE&level=JOURNEYWORKER", 400),
            ("/api/v1/employees/missing", 404),
        ]:
            with self.subTest(path=path), self.assertRaises(HTTPError) as result:
                self.get(path)
            self.assertEqual(result.exception.code, expected)
        request = Request(self.base + "/api/v1/rows", headers={"Host": "attacker.example"})
        with self.assertRaises(HTTPError) as result:
            urlopen(request)
        self.assertEqual(result.exception.code, 403)


if __name__ == "__main__":
    unittest.main()
