FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /app
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN uv sync --frozen --no-dev
COPY apps/api/lokifi ./lokifi
COPY apps/api/migrations ./migrations
COPY apps/api/alembic.ini ./
RUN useradd --create-home app && chown -R app:app /app
USER app
CMD ["sh", "-c", "uv run --no-sync alembic upgrade head && uv run --no-sync uvicorn lokifi.main:app --host 0.0.0.0 --port 18100"]
