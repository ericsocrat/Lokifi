FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
ENV PORT=8000
ENV POLYGON_KEY=""     ALPHAVANTAGE_KEY=""     FINNHUB_KEY=""     COINGECKO_KEY=""     CMC_KEY=""     NEWSAPI_KEY=""     MARKETAUX_KEY=""     FMP_KEY=""
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
