from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import Base, engine
from app.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
from app.routers import cases, documents, assistant


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="CESVI Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# Exception handlers for Mexican Spanish formatted responses {code, message}
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 Router
v1_router = APIRouter(prefix="/api/v1")


@v1_router.get("/health")
def health_check():
    return {"status": "ok"}


v1_router.include_router(cases.router)
v1_router.include_router(documents.router)
v1_router.include_router(assistant.router)

app.include_router(v1_router)
app.include_router(assistant.router)
