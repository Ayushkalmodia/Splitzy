from typing import Optional

from fastapi import APIRouter, Query

from app.models.schemas import MonthlyReportResponse
from app.services.report_service import monthly_report

router = APIRouter(prefix="/monthly-report", tags=["report"])


@router.get("", response_model=MonthlyReportResponse)
def report(month: Optional[str] = Query(default=None, description="Format: YYYY-MM")):
    return monthly_report(month)
