"""
MongoDB → PostgreSQL full sync for reporting (Power BI).

Run after applying SQL migrations:
  python -m etl.sync_expenses
"""

from __future__ import annotations

import argparse
import logging
import sys
from typing import Any, List, Tuple

import pandas as pd
from pymongo import MongoClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

from app.config import settings
from etl.transform_expenses import build_summary_tables, expenses_to_dataframes

logger = logging.getLogger(__name__)


def get_reporting_engine() -> Engine:
    url = (settings.reporting_database_url or "").strip()
    if not url:
        raise RuntimeError(
            "Set REPORTING_DATABASE_URL in .env (e.g. postgresql://user:pass@localhost:5432/splitzy_reporting)"
        )
    return create_engine(url, future=True)


def extract_from_mongo() -> Tuple[List[dict], List[dict], List[dict]]:
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    expenses = list(db.expenses.find({}))
    users = list(db.users.find({}))
    groups = list(db.groups.find({}))
    client.close()
    logger.info(
        "Extracted MongoDB: %d expenses, %d users, %d groups",
        len(expenses),
        len(users),
        len(groups),
    )
    return expenses, users, groups


def _truncate_reporting_facts(conn: Connection) -> None:
    conn.execute(text("TRUNCATE TABLE fact_ml_prediction"))
    conn.execute(text("TRUNCATE TABLE fact_expense"))
    for tbl in (
        "daily_spend_summary",
        "monthly_spend_summary",
        "category_summary",
        "ml_prediction_summary",
    ):
        conn.execute(text(f"TRUNCATE TABLE {tbl}"))


def _upsert_dim_category(conn: Connection, df: pd.DataFrame) -> None:
    if df.empty:
        return
    q = text(
        """
        INSERT INTO dim_category (category_slug, category_label, sort_order)
        VALUES (:category_slug, :category_label, :sort_order)
        ON CONFLICT (category_slug) DO UPDATE SET
            category_label = EXCLUDED.category_label,
            sort_order = EXCLUDED.sort_order
        """
    )
    for _, row in df.iterrows():
        conn.execute(
            q,
            {
                "category_slug": row["category_slug"],
                "category_label": row["category_label"],
                "sort_order": int(row["sort_order"]),
            },
        )


def _upsert_dim_user(conn: Connection, df: pd.DataFrame) -> None:
    if df.empty:
        return
    q = text(
        """
        INSERT INTO dim_user (user_id, email, display_name, role, source_updated_at)
        VALUES (:user_id, :email, :display_name, :role, :source_updated_at)
        ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email,
            display_name = EXCLUDED.display_name,
            role = EXCLUDED.role,
            source_updated_at = EXCLUDED.source_updated_at
        """
    )
    for _, row in df.iterrows():
        conn.execute(
            q,
            {
                "user_id": row["user_id"],
                "email": row["email"] if pd.notna(row.get("email")) else None,
                "display_name": row["display_name"],
                "role": row["role"],
                "source_updated_at": row["source_updated_at"]
                if pd.notna(row.get("source_updated_at"))
                else None,
            },
        )


def _upsert_dim_group(conn: Connection, df: pd.DataFrame) -> None:
    if df.empty:
        return
    q = text(
        """
        INSERT INTO dim_group (group_id, group_name, is_active, source_updated_at)
        VALUES (:group_id, :group_name, :is_active, :source_updated_at)
        ON CONFLICT (group_id) DO UPDATE SET
            group_name = EXCLUDED.group_name,
            is_active = EXCLUDED.is_active,
            source_updated_at = EXCLUDED.source_updated_at
        """
    )
    for _, row in df.iterrows():
        conn.execute(
            q,
            {
                "group_id": row["group_id"],
                "group_name": row["group_name"],
                "is_active": bool(row["is_active"]),
                "source_updated_at": row["source_updated_at"]
                if pd.notna(row.get("source_updated_at"))
                else None,
            },
        )


def _replace_dim_date(conn: Connection, df: pd.DataFrame) -> None:
    conn.execute(text("TRUNCATE TABLE dim_date"))
    if df.empty:
        return
    df.to_sql("dim_date", conn, if_exists="append", index=False, method="multi", chunksize=500)


def _insert_fact_expense(conn: Connection, df: pd.DataFrame) -> None:
    if df.empty:
        return
    cols = [
        "expense_id",
        "group_id",
        "user_id",
        "created_by_user_id",
        "expense_date",
        "amount",
        "currency",
        "category",
        "predicted_category",
        "category_confidence",
        "description",
        "merchant",
        "created_at",
        "updated_at",
        "source_updated_at",
    ]
    df[cols].to_sql("fact_expense", conn, if_exists="append", index=False, method="multi", chunksize=300)


def _insert_fact_ml(conn: Connection, df: pd.DataFrame) -> None:
    if df.empty:
        return
    out = df.copy()
    ts = pd.Timestamp.now(tz="UTC")
    out["synced_at"] = ts
    cols = [
        "expense_id",
        "predicted_category",
        "category_confidence",
        "manual_category",
        "is_override",
        "synced_at",
    ]
    out[cols].to_sql("fact_ml_prediction", conn, if_exists="append", index=False, method="multi", chunksize=500)


def _insert_summaries(
    conn: Connection,
    daily: pd.DataFrame,
    monthly: pd.DataFrame,
    cat: pd.DataFrame,
    ml: pd.DataFrame,
) -> None:
    if not daily.empty:
        daily.to_sql("daily_spend_summary", conn, if_exists="append", index=False)
    if not monthly.empty:
        monthly.to_sql("monthly_spend_summary", conn, if_exists="append", index=False)
    if not cat.empty:
        cat.to_sql("category_summary", conn, if_exists="append", index=False)
    if not ml.empty:
        ml.to_sql("ml_prediction_summary", conn, if_exists="append", index=False)


def run_sync(engine: Engine | None = None) -> dict[str, Any]:
    """Execute full ETL. Returns summary stats."""
    engine = engine or get_reporting_engine()
    exp_docs, user_docs, group_docs = extract_from_mongo()
    cat_df, user_df, group_df, date_df, fact_df, ml_df = expenses_to_dataframes(
        exp_docs, user_docs, group_docs
    )
    daily, monthly, cat_sum, ml_sum = build_summary_tables(fact_df)

    with engine.begin() as conn:
        _truncate_reporting_facts(conn)
        _upsert_dim_category(conn, cat_df)
        _upsert_dim_user(conn, user_df)
        _upsert_dim_group(conn, group_df)
        _replace_dim_date(conn, date_df)
        _insert_fact_expense(conn, fact_df)
        _insert_fact_ml(conn, ml_df)
        _insert_summaries(conn, daily, monthly, cat_sum, ml_sum)

    logger.info(
        "Load complete: %d fact rows, %d ML rows, %d daily summary rows",
        len(fact_df),
        len(ml_df),
        len(daily),
    )
    return {
        "mongo_expenses": len(exp_docs),
        "fact_rows": len(fact_df),
        "ml_rows": len(ml_df),
        "dim_users": len(user_df),
        "dim_groups": len(group_df),
    }


def main(argv: List[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Sync Mongo expenses into PostgreSQL reporting DB")
    parser.parse_args(argv)
    try:
        stats = run_sync()
        print("OK", stats)
        return 0
    except Exception as e:
        logger.exception("Sync failed: %s", e)
        print("FAILED:", e, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
