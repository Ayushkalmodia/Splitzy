#!/usr/bin/env python3
"""
Apply PostgreSQL reporting migrations (001 schema + 002 Power BI views).

Usage (from python-service directory):
  export REPORTING_DATABASE_URL=postgresql://user:pass@localhost:5432/splitzy_reporting
  python scripts/apply_reporting_migrations.py

Requires: psycopg2 (via psycopg2-binary).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import psycopg2

from app.config import settings


def apply_migrations(dsn: str) -> None:
    root = Path(__file__).resolve().parent.parent
    migration_dir = root / "sql" / "migrations"
    files = ["001_reporting_schema.sql", "002_powerbi_views.sql"]
    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    try:
        cur = conn.cursor()
        for name in files:
            path = migration_dir / name
            if not path.is_file():
                raise FileNotFoundError(path)
            sql = path.read_text(encoding="utf-8")
            cur.execute(sql)
            print(f"Applied {name}")
    finally:
        conn.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dsn",
        default="",
        help="PostgreSQL DSN (default: REPORTING_DATABASE_URL from env / .env)",
    )
    args = parser.parse_args()
    dsn = (args.dsn or settings.reporting_database_url or "").strip()
    if not dsn:
        print("Set REPORTING_DATABASE_URL or pass --dsn", file=sys.stderr)
        return 1
    try:
        apply_migrations(dsn)
        print("Migrations OK")
        return 0
    except Exception as e:
        print("Migration failed:", e, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
