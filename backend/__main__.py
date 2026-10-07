"""Run `python -m backend import CSV` or `python -m backend serve`."""

import argparse
import json
from pathlib import Path

from backend.db import connect, import_csv
from backend.server import serve


def main():
    parser = argparse.ArgumentParser(description="Local payroll SQLite service")
    parser.add_argument("--db", type=Path, default=Path(__file__).with_name("payroll.sqlite"))
    commands = parser.add_subparsers(dest="command", required=True)
    importer = commands.add_parser("import", help="Replace database records from a CSV")
    importer.add_argument("csv", type=Path)
    server = commands.add_parser("serve", help="Serve the loopback API")
    server.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    if args.command == "import":
        with connect(args.db) as db:
            print(json.dumps(import_csv(db, args.csv)))
    else:
        serve(args.db, args.port)


if __name__ == "__main__":
    main()
