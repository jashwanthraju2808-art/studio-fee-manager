from fastapi import FastAPI
from app.routers.members import router as member_router

app = FastAPI(
    title="Studio Fee Manager API",
    version="1.0.0"
)

app.include_router(member_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to Studio Fee Manager API"
    }


@app.get("/health")
def health():
    return {
        "status": "Healthy"
    }