from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError

from . import identity, imports, market_data, portfolios
from .config import settings
from .database import SessionLocal
from .schemas import Message

app = FastAPI(
    title="Lokifi portfolio API",
    version="2.1.0",
    docs_url=None,
    redoc_url=None,
    separate_input_output_schemas=False,
)
for router in (identity.router, portfolios.router, imports.router, market_data.router):
    app.include_router(router, prefix="/api/v1")


@app.middleware("http")
async def security(request: Request, call_next):
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        if request.headers.get("origin") != settings().web_origin:
            return JSONResponse({"detail": "Untrusted request origin"}, status_code=403)
        if request.headers.get("sec-fetch-site") == "cross-site":
            return JSONResponse({"detail": "Cross-site request rejected"}, status_code=403)
        # Buffer a bounded body, including chunked requests before Pydantic parses it.
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > 600_000:
                return JSONResponse({"detail": "Request too large"}, status_code=413)
        request._body = bytes(body)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.exception_handler(IntegrityError)
async def conflict(_request, _exc):
    return JSONResponse(
        {"detail": "This record already exists or changed elsewhere. Refresh and try again."}, status_code=409
    )


@app.exception_handler(OperationalError)
async def unavailable(_request, _exc):
    return JSONResponse(
        {"detail": "Storage is temporarily unavailable. Your request was not confirmed."}, status_code=503
    )


@app.exception_handler(RequestValidationError)
async def validation(_request, exc):
    # Never echo submitted credentials or financial rows in error responses.
    errors = [{"field": ".".join(map(str, e["loc"][1:])), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(
        {"detail": "; ".join(f"{e['field']}: {e['message']}" for e in errors)}, status_code=422
    )


@app.get("/api/v1/health", response_model=Message)
def health():
    with SessionLocal() as db:
        db.execute(text("SELECT 1 FROM alembic_version"))
    return {"detail": "ready"}


@app.get("/api/v1/admin/status", response_model=Message, dependencies=[Depends(identity.administrator)])
def admin_status():
    return {"detail": "Administrator access verified"}
