from fastapi import FastAPI
from app.api.routes import , chat

app = FastAPI()

app.include_router(market.router, prefix="/api")


app.include_router(alerts.router, prefix='/api')



app.include_router(social.router, prefix='/api')


app.include_router(portfolio.router, prefix='/api')


app.include_router(auth.router, prefix='/api')


app.include_router(chat.router, prefix='/api')

