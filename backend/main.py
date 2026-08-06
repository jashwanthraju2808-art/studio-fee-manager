from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.init_db import *
from app.routers.members import router as member_router
from app.routers.payment import router as payment_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Studio Fee Manager API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(member_router)
app.include_router(payment_router)

@app.get("/")
def home():
    return {"message": "Welcome to Studio Fee Manager API"}

@app.get("/health")
def health():
    return {"status": "Healthy"}