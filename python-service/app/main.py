from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.db import mongo
from app.routes.anomaly import router as anomaly_router
from app.routes.categorize import router as categorize_router
from app.routes.categorize_expense import router as categorize_expense_router
from app.routes.report import router as report_router
from app.routes.budget_insights import router as budget_insights_router
from app.routes.settlement import router as settlement_router
from app.utils.logging import setup_logging
from app.services.category_predictor import load_category_model


@asynccontextmanager
async def lifespan(_: FastAPI):
    mongo.connect()
    load_category_model()
    yield
    mongo.close()


setup_logging()
app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    lifespan=lifespan,
)


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}


app.include_router(categorize_router)
app.include_router(categorize_expense_router)
app.include_router(anomaly_router)
app.include_router(report_router)
app.include_router(settlement_router)
app.include_router(budget_insights_router)
