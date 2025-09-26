from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import , chat

app = FastAPI()


import os
_frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(market.router, prefix="/api")


app.include_router(alerts.router, prefix='/api')



app.include_router(social.router, prefix='/api')


app.include_router(portfolio.router, prefix='/api')


app.include_router(auth.router, prefix='/api')


app.include_router(chat.router, prefix='/api')


