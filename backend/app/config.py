from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ALLOWED_ORIGINS: str = "http://localhost:5173,https://cesvi.vercel.app"
    DATABASE_URL: str = "sqlite:///./cesvi.db"
    UPLOAD_DIR: str = "./uploads"

    # AI settings for later phases
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    MAX_TOKENS: int = 512
    TEMPERATURE: float = 0.1
    MAX_HISTORY_MESSAGES: int = 6
    MAX_EXTRACT_CHARS: int = 4000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
