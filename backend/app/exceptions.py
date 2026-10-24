from fastapi import Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.code, "message": exc.message},
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    code = "HTTP_ERROR"
    if exc.status_code == 404:
        code = "NOT_FOUND"
        message = "El recurso solicitado no fue encontrado."
    elif exc.status_code == 400:
        code = "BAD_REQUEST"
        message = exc.detail if isinstance(exc.detail, str) else "La solicitud es incorrecta o inválida."
    elif exc.status_code == 503:
        code = "SERVICE_UNAVAILABLE"
        message = exc.detail if isinstance(exc.detail, str) else "El servicio no se encuentra disponible temporalmente."
    else:
        message = exc.detail if isinstance(exc.detail, str) else "Ocurrió un error al procesar la solicitud."

    return JSONResponse(
        status_code=exc.status_code,
        content={"code": code, "message": message},
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": "Los datos proporcionados son inválidos o están incompletos.",
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "Ocurrió un error inesperado en el servidor.",
        },
    )
