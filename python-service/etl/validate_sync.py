"""
Post-sync validation: compare PostgreSQL reporting tables to MongoDB source of truth.

Used by tests and optionally after `python -m etl.sync_expenses`.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, List, Tuple

from pymongo import MongoClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.config import settings
from etl.transform_expenses import expense_document_to_fact_row

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    ok: bool = True
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)

    def add_error(self, msg: str) -> None:
        self.ok = False
        self.errors.append(msg)


def _mongo_valid_totals(exp_docs: List[dict]) -> Tuple[int, float]:
    n = 0
    total = 0.0
    for d in exp_docs:
        row = expense_document_to_fact_row(d)
        if row:
            n += 1
            total += float(row["amount"])
    return n, total


def _mongo_ml_stats(exp_docs: List[dict]) -> Tuple[int, int, float]:
    """Rows with ML signal, override count among those, sum confidence where present."""
    with_pred = 0
    overrides = 0
    conf_sum = 0.0
    conf_n = 0
    for d in exp_docs:
        row = expense_document_to_fact_row(d)
        if not row:
            continue
        pred = row.get("predicted_category")
        conf = row.get("category_confidence")
        if pred is None and conf is None:
            continue
        with_pred += 1
        cat = (row.get("category") or "").strip().lower()
        ps = (pred or "").strip().lower()
        if ps and cat and ps != cat:
            overrides += 1
        if conf is not None:
            conf_sum += float(conf)
            conf_n += 1
    return with_pred, overrides, (conf_sum / conf_n) if conf_n else 0.0


def validate_against_mongo(engine: Engine | None = None) -> ValidationResult:
    engine = engine or create_engine(settings.reporting_database_url, future=True)
    res = ValidationResult()

    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    exp_docs = list(db.expenses.find({}))
    client.close()

    valid_n, valid_total = _mongo_valid_totals(exp_docs)
    res.metrics["mongo_valid_expense_rows"] = valid_n
    res.metrics["mongo_valid_amount_total"] = valid_total

    with engine.connect() as conn:
        pg_count = conn.execute(text("SELECT COUNT(*) FROM fact_expense")).scalar() or 0
        pg_sum = float(conn.execute(text("SELECT COALESCE(SUM(amount),0) FROM fact_expense")).scalar() or 0)
        res.metrics["pg_fact_rows"] = int(pg_count)
        res.metrics["pg_amount_total"] = pg_sum

        if int(pg_count) != valid_n:
            res.add_error(f"Row count: fact_expense={pg_count} expected {valid_n} (valid Mongo rows)")

        if abs(pg_sum - valid_total) > 0.02:
            res.add_error(f"Amount total: PG={pg_sum:.4f} Mongo(valid)={valid_total:.4f}")

        # KPI queries (Power BI–style checks)
        monthly = conn.execute(
            text(
                """
                SELECT COALESCE(SUM(total_amount),0) AS s, COALESCE(SUM(transaction_count),0) AS c
                FROM monthly_spend_summary
                """
            )
        ).mappings().first()
        res.metrics["sql_monthly_total_amount"] = float(monthly["s"] or 0)
        res.metrics["sql_monthly_tx_count"] = int(monthly["c"] or 0)

        daily = conn.execute(
            text("SELECT COALESCE(SUM(total_amount),0) FROM daily_spend_summary")
        ).scalar()
        res.metrics["sql_daily_total_amount"] = float(daily or 0)

        cat_rows = conn.execute(
            text("SELECT COUNT(*) FROM category_summary")
        ).scalar()
        res.metrics["category_summary_rows"] = int(cat_rows or 0)

        override_sql = conn.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (
                        WHERE predicted_category IS NOT NULL OR category_confidence IS NOT NULL
                    ) AS ml_signal_rows,
                    COUNT(*) FILTER (WHERE is_manual_override) AS overrides,
                    AVG(category_confidence) FILTER (WHERE category_confidence IS NOT NULL) AS avg_c
                FROM fact_expense
                """
            )
        ).mappings().first()

        m_pred, m_over, m_avg_c = _mongo_ml_stats(exp_docs)
        res.metrics["mongo_ml_rows"] = m_pred
        res.metrics["mongo_override_count"] = m_over
        res.metrics["mongo_avg_confidence"] = m_avg_c
        res.metrics["pg_ml_signal_rows"] = int(override_sql["ml_signal_rows"] or 0)
        res.metrics["pg_override_count"] = int(override_sql["overrides"] or 0)
        avg_pg = override_sql["avg_c"]
        res.metrics["pg_avg_confidence"] = float(avg_pg) if avg_pg is not None else None

        if int(override_sql["ml_signal_rows"] or 0) != m_pred:
            res.add_error(
                f"ML signal row count mismatch: PG={override_sql['ml_signal_rows']} Mongo={m_pred}"
            )

        if int(override_sql["overrides"] or 0) != m_over:
            res.add_error(
                f"Override count mismatch: PG={override_sql['overrides']} Mongo={m_over}"
            )

        if m_avg_c and avg_pg is not None and abs(float(avg_pg) - m_avg_c) > 0.0001:
            res.warnings.append(
                f"Avg confidence drift PG={avg_pg} Mongo={m_avg_c} (check rounding)"
            )

        # Summary vs fact consistency
        sum_monthly = conn.execute(
            text("SELECT COALESCE(SUM(total_amount),0) FROM monthly_spend_summary")
        ).scalar()
        if abs(float(sum_monthly or 0) - pg_sum) > 0.05:
            res.add_error(
                f"monthly_spend_summary total {sum_monthly} != fact_expense sum {pg_sum}"
            )

    return res


def assert_sync_ok(engine: Engine | None = None) -> None:
    r = validate_against_mongo(engine)
    if not r.ok:
        raise AssertionError("; ".join(r.errors))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from etl.sync_expenses import get_reporting_engine

    eng = get_reporting_engine()
    out = validate_against_mongo(eng)
    print("ok" if out.ok else "FAILED", out.metrics)
    for e in out.errors:
        print("ERROR:", e)
    for w in out.warnings:
        print("WARN:", w)
