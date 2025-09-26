from fastapi import FastAPI
from app.api.routes import , auth

app = FastAPI()

app.include_router(market.router, prefix="/api")


app.include_router(alerts.router, prefix='/api')



app.include_router(social.router, prefix='/api')


app.include_router(portfolio.router, prefix='/api')


app.include_router(auth.router, prefix='/api')

