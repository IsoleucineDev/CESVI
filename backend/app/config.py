from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:8443,http://localhost:3000,http://127.0.0.1:8443,http://127.0.0.1:5173,https://cesvi.vercel.app"
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'cesvi.db'}"
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")

    # AI settings
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    MAX_TOKENS: int = 300
    TEMPERATURE: float = 0.2
    MAX_HISTORY_MESSAGES: int = 6
    MAX_EXTRACT_CHARS: int = 4000

    model_config = SettingsConfigDict(
        env_file=(str(BASE_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
