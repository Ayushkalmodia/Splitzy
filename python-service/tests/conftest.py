"""Pytest fixtures: isolated FastAPI app for /categorize-expense (no Mongo lifespan)."""

import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

from app.routes.categorize_expense import router as categorize_expense_router


@pytest.fixture
def categorize_client() -> TestClient:
    app = FastAPI()
    app.include_router(categorize_expense_router)
    with TestClient(app, raise_server_exceptions=True) as client:
        yield client
