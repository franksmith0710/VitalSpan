from fastapi import APIRouter

from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.me import router as me_router

api_v1_router = APIRouter()
api_v1_router.include_router(me_router)
api_v1_router.include_router(ingestion_router)
