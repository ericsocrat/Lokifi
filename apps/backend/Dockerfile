FROM python:3.12-slim
WORKDIR /app

# Install system dependencies for healthchecks and service waiting
RUN apt-get update && \
    apt-get install -y \
    curl \
    postgresql-client \
    redis-tools \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY docker-entrypoint-ci.sh ./
RUN chmod +x docker-entrypoint-ci.sh

ENV PORT=8000
ENV POLYGON_KEY=""     ALPHAVANTAGE_KEY=""     FINNHUB_KEY=""     COINGECKO_KEY=""     CMC_KEY=""     NEWSAPI_KEY=""     MARKETAUX_KEY=""     FMP_KEY=""

# Default command (can be overridden by docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-exclude", ".pytest_cache"]