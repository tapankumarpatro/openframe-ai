"""API log endpoints — retrieve call history and stats."""

from fastapi import APIRouter
from typing import Optional
from api.services.api_logger import ApiLogger

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("")
async def get_logs(limit: int = 100, call_type: Optional[str] = None):
    return {
        "logs": ApiLogger.get_all(limit=limit, call_type=call_type),
        "stats": ApiLogger.get_stats(),
    }


@router.delete("")
async def clear_logs():
    ApiLogger.clear()
    return {"message": "Logs cleared"}
