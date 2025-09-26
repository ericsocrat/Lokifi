from fastapi import FastAPI
from app.api.routes import , alerts

app = FastAPI()

app.include_router(market.router, prefix="/api")


app.include_router(alerts.router, prefix='/api')


