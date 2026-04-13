"""
Transform Mongo expense / user / group documents into reporting DataFrames.

Pure functions — easy to unit test without databases.
"""

from __future__ import annotations

import calendar
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

# Known slugs from React app + ML mapping; ETL also adds any unseen slugs to dim_category.
DEFAULT_CATEGORY_SLUGS: List[Tuple[str, str, int]] = [
    ("food", "Food & Dining", 10),
    ("transport", "Travel & Transport", 20),
    ("shopping", "Shopping", 30),
    ("utilities", "Utilities", 40),
    ("entertainment", "Entertainment", 50),
    ("rent", "Rent", 55),
    ("accommodation", "Accommodation", 58),
    ("other", "Other", 99),
]


def extract_oid(value: Any) -> Optional[str]:
    """Normalize Mongo ObjectId, populated ref dict, or string to 24-char hex string."""
    if value is None:
        return None
    if isinstance(value, dict):
        inner = value.get("_id", value.get("id"))
        if inner is not None:
            return str(inner)
        return None
    return str(value)


def _parse_dt(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, date) and not isinstance(value, datetime):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
    return None


def expense_document_to_fact_row(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Map one Mongo expense document to fact_expense row dict.
    Returns None if required fields are missing (invalid for reporting).
    """
    eid = extract_oid(doc.get("_id"))
    gid = extract_oid(doc.get("groupId"))
    payer = extract_oid(doc.get("paidBy"))
    creator = extract_oid(doc.get("createdBy"))

    if not eid or not gid or not payer:
        return None

    amt = doc.get("amount")
    try:
        amount = float(amt)
    except (TypeError, ValueError):
        return None
    if amount < 0:
        return None

    exp_date = _parse_dt(doc.get("date")) or _parse_dt(doc.get("createdAt"))
    if not exp_date:
        return None
    exp_date_only = exp_date.date()

    created = _parse_dt(doc.get("createdAt")) or exp_date
    updated = _parse_dt(doc.get("updatedAt"))

    cat = (doc.get("category") or "other").strip().lower() or "other"
    pred = doc.get("predictedCategory")
    pred_s = pred.strip().lower() if isinstance(pred, str) and pred.strip() else None

    conf = doc.get("categoryConfidence")
    conf_f: Optional[float] = None
    if conf is not None:
        try:
            c = float(conf)
            if 0 <= c <= 1:
                conf_f = c
        except (TypeError, ValueError):
            pass

    merchant = doc.get("merchant") or ""
    if not isinstance(merchant, str):
        merchant = str(merchant)

    desc = doc.get("description") or ""
    if not isinstance(desc, str):
        desc = str(desc)

    currency = (doc.get("currency") or "USD").upper()[:3]

    return {
        "expense_id": eid,
        "group_id": gid,
        "user_id": payer,
        "created_by_user_id": creator,
        "expense_date": exp_date_only,
        "amount": amount,
        "currency": currency,
        "category": cat,
        "predicted_category": pred_s,
        "category_confidence": conf_f,
        "description": desc[:2000] if desc else None,
        "merchant": merchant[:255] if merchant else None,
        "created_at": created,
        "updated_at": updated,
        "source_updated_at": updated or created,
    }


def ml_row_from_fact_row(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Build fact_ml_prediction row; skip if no ML signal at all."""
    eid = row.get("expense_id")
    pred = row.get("predicted_category")
    conf = row.get("category_confidence")
    manual = row.get("category")
    if not eid or not manual:
        return None
    if pred is None and conf is None:
        return None
    cat = (manual or "").strip().lower()
    pred_s = (pred or "").strip().lower() if pred else ""
    is_override = bool(pred_s and cat and cat != pred_s)
    return {
        "expense_id": eid,
        "predicted_category": pred_s or None,
        "category_confidence": conf,
        "manual_category": cat,
        "is_override": is_override,
    }


def user_document_to_dim_row(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    uid = extract_oid(doc.get("_id"))
    if not uid:
        return None
    email = doc.get("email") or ""
    name = doc.get("name") or email or "User"
    role = doc.get("role") or "member"
    upd = _parse_dt(doc.get("updatedAt"))
    return {
        "user_id": uid,
        "email": str(email)[:255],
        "display_name": str(name)[:255],
        "role": str(role)[:32],
        "source_updated_at": upd,
    }


def group_document_to_dim_row(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    gid = extract_oid(doc.get("_id"))
    if not gid:
        return None
    name = doc.get("name") or "Group"
    active = doc.get("isActive", True)
    upd = _parse_dt(doc.get("updatedAt"))
    return {
        "group_id": gid,
        "group_name": str(name)[:255],
        "is_active": bool(active),
        "source_updated_at": upd,
    }


def collect_category_slugs_from_expenses(fact_rows: List[Dict[str, Any]]) -> Set[str]:
    out: Set[str] = set()
    for r in fact_rows:
        c = r.get("category")
        if c:
            out.add(str(c).strip().lower())
        p = r.get("predicted_category")
        if p:
            out.add(str(p).strip().lower())
    return out


def build_dim_category_df(fact_rows: List[Dict[str, Any]]) -> pd.DataFrame:
    """Merge seed slugs with any slugs seen in facts."""
    rows = {s: (lbl, ord_) for s, lbl, ord_ in DEFAULT_CATEGORY_SLUGS}
    for slug in collect_category_slugs_from_expenses(fact_rows):
        if slug not in rows:
            rows[slug] = (slug.replace("_", " ").title(), 90)
    data = [
        {"category_slug": s, "category_label": lbl, "sort_order": ord_}
        for s, (lbl, ord_) in sorted(rows.items(), key=lambda x: x[1][1])
    ]
    return pd.DataFrame(data)


def build_dim_date_df(min_d: date, max_d: date) -> pd.DataFrame:
    """Generate dim_date rows between min and max inclusive."""
    if min_d > max_d:
        min_d, max_d = max_d, min_d
    idx = pd.date_range(min_d, max_d, freq="D")
    rows = []
    for ts in idx:
        d = ts.date()
        iso = ts.isocalendar()
        rows.append(
            {
                "date_key": d,
                "year_num": d.year,
                "month_num": d.month,
                "day_of_month": d.day,
                "week_of_year": int(iso.week),
                "iso_year": int(iso.year),
                "iso_week": int(iso.week),
                "month_name": calendar.month_name[d.month],
                "day_of_week": d.weekday() + 1,
                "day_name": calendar.day_name[d.weekday()],
                "is_weekend": d.weekday() >= 5,
                "quarter_num": (d.month - 1) // 3 + 1,
                "year_month": f"{d.year:04d}-{d.month:02d}",
            }
        )
    return pd.DataFrame(rows)


def ensure_stub_users(fact_rows: List[Dict[str, Any]], user_df: pd.DataFrame) -> pd.DataFrame:
    """Add placeholder dim_user rows for payer / creator IDs missing from Mongo users."""
    if user_df.empty or "user_id" not in user_df.columns:
        known: Set[str] = set()
    else:
        known = set(user_df["user_id"].astype(str))
    needed: Set[str] = set()
    for r in fact_rows:
        needed.add(r["user_id"])
        cb = r.get("created_by_user_id")
        if cb:
            needed.add(cb)
    missing = needed - known
    if not missing:
        return user_df
    stubs = pd.DataFrame(
        [
            {
                "user_id": uid,
                "email": None,
                "display_name": "Unknown user",
                "role": "unknown",
                "source_updated_at": None,
            }
            for uid in sorted(missing)
        ]
    )
    if len(user_df) == 0:
        return stubs
    return pd.concat([user_df, stubs], ignore_index=True)


def expenses_to_dataframes(
    expense_docs: List[Dict[str, Any]],
    user_docs: List[Dict[str, Any]],
    group_docs: List[Dict[str, Any]],
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Full transform pipeline returning:
    dim_category, dim_user, dim_group, dim_date, fact_expense, fact_ml_prediction
    """
    fact_list: List[Dict[str, Any]] = []
    for doc in expense_docs:
        row = expense_document_to_fact_row(doc)
        if row:
            fact_list.append(row)

    user_rows = [user_document_to_dim_row(d) for d in user_docs]
    user_rows = [u for u in user_rows if u]
    user_df = pd.DataFrame(user_rows) if user_rows else pd.DataFrame(columns=["user_id", "email", "display_name", "role", "source_updated_at"])

    group_rows = [group_document_to_dim_row(d) for d in group_docs]
    group_rows = [g for g in group_rows if g]
    group_df = pd.DataFrame(group_rows) if group_rows else pd.DataFrame(columns=["group_id", "group_name", "is_active", "source_updated_at"])

    user_df = ensure_stub_users(fact_list, user_df)

    cat_df = build_dim_category_df(fact_list)

    if not fact_list:
        empty_fact = pd.DataFrame(
            columns=[
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
        )
        empty_ml = pd.DataFrame(
            columns=[
                "expense_id",
                "predicted_category",
                "category_confidence",
                "manual_category",
                "is_override",
            ]
        )
        today = datetime.now(timezone.utc).date()
        date_df = build_dim_date_df(today, today)
        return cat_df, user_df, group_df, date_df, empty_fact, empty_ml

    fact_df = pd.DataFrame(fact_list)
    # De-duplicate by expense_id (last wins — stable sync)
    fact_df = fact_df.drop_duplicates(subset=["expense_id"], keep="last")

    min_d = fact_df["expense_date"].min()
    max_d = fact_df["expense_date"].max()
    today = datetime.now(timezone.utc).date()
    date_df = build_dim_date_df(min(min_d, today), max(max_d, today))

    ml_list = []
    for _, row in fact_df.iterrows():
        mr = ml_row_from_fact_row(row.to_dict())
        if mr:
            ml_list.append(mr)
    ml_df = pd.DataFrame(ml_list) if ml_list else pd.DataFrame(
        columns=["expense_id", "predicted_category", "category_confidence", "manual_category", "is_override"]
    )
    if len(ml_df):
        ml_df = ml_df.drop_duplicates(subset=["expense_id"], keep="last")

    return cat_df, user_df, group_df, date_df, fact_df, ml_df


def build_summary_tables(fact_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Build daily / monthly / category / ML summary DataFrames from fact_expense."""
    if fact_df.empty:
        return (
            pd.DataFrame(columns=["summary_date", "group_id", "total_amount", "transaction_count"]),
            pd.DataFrame(
                columns=["year_month", "group_id", "total_amount", "transaction_count", "days_in_month"]
            ),
            pd.DataFrame(columns=["period_month", "group_id", "category", "total_amount", "transaction_count"]),
            pd.DataFrame(
                columns=[
                    "period_month",
                    "group_id",
                    "prediction_count",
                    "avg_confidence",
                    "override_count",
                    "override_rate",
                ]
            ),
        )

    f = fact_df.copy()
    f["year_month"] = f["expense_date"].apply(lambda d: f"{d.year:04d}-{d.month:02d}")

    daily = (
        f.groupby(["expense_date", "group_id"], as_index=False)
        .agg(total_amount=("amount", "sum"), transaction_count=("expense_id", "count"))
        .rename(columns={"expense_date": "summary_date"})
    )

    def days_in_month(ym: str) -> int:
        y, m = map(int, ym.split("-"))
        return calendar.monthrange(y, m)[1]

    monthly = (
        f.groupby(["year_month", "group_id"], as_index=False)
        .agg(total_amount=("amount", "sum"), transaction_count=("expense_id", "count"))
    )
    monthly["days_in_month"] = monthly["year_month"].apply(days_in_month)

    cat_sum = (
        f.groupby(["year_month", "group_id", "category"], as_index=False)
        .agg(total_amount=("amount", "sum"), transaction_count=("expense_id", "count"))
        .rename(columns={"year_month": "period_month"})
    )

    ml_base = f[f["predicted_category"].notna() | f["category_confidence"].notna()].copy()
    if ml_base.empty:
        ml_sum = pd.DataFrame(
            columns=[
                "period_month",
                "group_id",
                "prediction_count",
                "avg_confidence",
                "override_count",
                "override_rate",
            ]
        )
    else:
        pred_norm = ml_base["predicted_category"].fillna("").astype(str).str.lower()
        cat_norm = ml_base["category"].fillna("").astype(str).str.lower()
        ml_base = ml_base.assign(
            is_override=(ml_base["predicted_category"].notna() & (pred_norm != cat_norm))
        )
        ml_rows: List[Dict[str, Any]] = []
        for (ym, gid), g in ml_base.groupby(["year_month", "group_id"]):
            pc = g["category_confidence"].dropna()
            oc = int(g["is_override"].sum())
            cnt = len(g)
            ml_rows.append(
                {
                    "period_month": ym,
                    "group_id": gid,
                    "prediction_count": cnt,
                    "avg_confidence": float(pc.mean()) if len(pc) else None,
                    "override_count": oc,
                    "override_rate": (oc / cnt) if cnt else None,
                }
            )
        ml_sum = pd.DataFrame(ml_rows)

    return daily, monthly, cat_sum, ml_sum
