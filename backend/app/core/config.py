from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "NyayaVault"
    ENV: str = "development"

    DATABASE_URL: str = "postgresql+psycopg2://nyayavault:nyayavault@localhost:5432/nyayavault"

    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    GEMINI_ENABLED: bool = False
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 26214400

    # Vercel Blob storage — used instead of local disk when deployed to Vercel (serverless
    # functions have no persistent filesystem). BLOB_READ_WRITE_TOKEN is injected automatically
    # once a Blob store is connected to the Vercel project. BLOB_PUBLIC_BASE_URL must be copied
    # by hand from that store's settings (Storage tab -> the store -> ".public.blob.vercel-storage.com"
    # base URL) — it's what lets read()/exists() reconstruct a file's URL from its stored path.
    BLOB_READ_WRITE_TOKEN: str = ""
    BLOB_PUBLIC_BASE_URL: str = ""

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
