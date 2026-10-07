"""Loopback-only JSON service for the imported payroll dataset."""

import json
from contextlib import closing
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from backend.db import connect
from backend.queries import overview, rows
from backend.reports import (employee_comparison, employee_detail, employee_directory,
                             meta, weekly_comparisons)


def handler_for(database: Path):
    class PayrollHandler(BaseHTTPRequestHandler):
        def send_json(self, status: int, payload):
            data = json.dumps(payload, allow_nan=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            expected_port = self.server.server_port
            allowed_hosts = {f"127.0.0.1:{expected_port}", f"localhost:{expected_port}"}
            if self.headers.get("Host") not in allowed_hosts:
                return self.send_json(403, {"error": "Invalid Host header"})
            parsed = urlsplit(self.path)
            try:
                raw_filters = parse_qs(parsed.query, keep_blank_values=True)
                if any(len(values) != 1 for values in raw_filters.values()):
                    raise ValueError("Each filter may appear only once")
                filters = {key: values[0] for key, values in raw_filters.items()}
                with closing(connect(database)) as db:
                    if parsed.path == "/api/v1/health":
                        ready = db.execute("SELECT 1 FROM import_batches LIMIT 1").fetchone() is not None
                        return self.send_json(200 if ready else 503, {"ready": ready})
                    if parsed.path == "/api/v1/meta":
                        if filters:
                            raise ValueError("Meta does not accept filters")
                        return self.send_json(200, meta(db))
                    if parsed.path == "/api/v1/rows":
                        return self.send_json(200, {"rows": rows(db, filters)})
                    if parsed.path == "/api/v1/overview":
                        return self.send_json(200, overview(db, filters))
                    if parsed.path == "/api/v1/employees":
                        return self.send_json(200, {"employees": employee_directory(db, filters)})
                    if parsed.path == "/api/v1/comparisons/weekly":
                        return self.send_json(200, {"weekly": weekly_comparisons(db, filters)})
                    parts = parsed.path.split("/")
                    if len(parts) in (5, 6) and parts[:4] == ["", "api", "v1", "employees"]:
                        employee_id = unquote(parts[4])
                        if not employee_id:
                            raise ValueError("Missing employee ID")
                        if len(parts) == 6 and parts[5] == "comparison":
                            payload = employee_comparison(db, employee_id, filters)
                        elif len(parts) == 5:
                            payload = employee_detail(db, employee_id, filters)
                        else:
                            payload = None
                        return self.send_json(200 if payload is not None else 404,
                                              payload if payload is not None else {"error": "Not found"})
                    return self.send_json(404, {"error": "Not found"})
            except ValueError as error:
                return self.send_json(400, {"error": str(error)})

    return PayrollHandler


def serve(database: Path, port: int = 8765):
    server = ThreadingHTTPServer(("127.0.0.1", port), handler_for(database))
    print(f"Payroll API listening at http://127.0.0.1:{server.server_port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
