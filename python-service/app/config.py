from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Splitzy Python Service"
    app_env: str = "development"
    app_debug: bool = True
    app_port: int = 8001
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "splitzy"
    # PostgreSQL reporting warehouse (Power BI / ETL). Optional for API-only runs.
    reporting_database_url: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
