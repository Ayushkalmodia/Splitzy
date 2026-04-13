from __future__ import annotations

from pymongo import MongoClient

from app.config import settings


class MongoConnection:
    def __init__(self) -> None:
        self.client: MongoClient | None = None

    def connect(self) -> None:
        if self.client is None:
            self.client = MongoClient(settings.mongodb_uri)

    def close(self) -> None:
        if self.client is not None:
            self.client.close()
            self.client = None

    @property
    def db(self):
        if self.client is None:
            raise RuntimeError("Mongo client is not initialized. Call connect() first.")
        return self.client[settings.mongodb_db_name]


mongo = MongoConnection()
