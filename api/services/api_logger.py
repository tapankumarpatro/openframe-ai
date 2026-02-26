"""Persistent API call logger — stores all outbound API calls in SQLite via SQLAlchemy."""

import uuid
import time
from dataclasses import dataclass, field, asdict
from typing import Optional, List

from sqlalchemy import desc, func
from api.services.database import SessionLocal
from api.models.db_models import ApiLog

# Estimated credit costs per model call (USD)
CREDIT_ESTIMATES = {
    # Image generation
    "seedream/4.5-text-to-image": 0.03,
    "seedream/4.5-edit": 0.05,
    # Text / prompt
    "prompt-writer": 0.01,
    "workflow-pipeline": 0.10,
    # Video generation (kie.ai, 1 credit = $0.005)
    "kling-2.6/image-to-video": 0.35,
    "bytedance/v1-pro-fast-image-to-video": 0.25,
    "bytedance/seedance-1.5-pro": 0.40,
    "kling-3.0/video": 0.35,
    "hailuo/02-text-to-video-pro": 0.30,
    "wan/2-6-text-to-video": 0.25,
    "sora-2-pro-text-to-video": 0.80,
    "kling/v2-5-turbo-text-to-video-pro": 0.30,
    "veo3_fast": 0.40,
    "veo3": 2.00,
}


@dataclass
class ApiLogEntry:
    """Lightweight dataclass used as the return type from ApiLogger methods.
    Keeps the same interface that all existing route code expects."""
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    timestamp: float = field(default_factory=time.time)
    call_type: str = ""            # "image_generation" | "prompt_enhancement" | "workflow_pipeline" | "video_generation"
    model: str = ""                # e.g. "seedream/4.5-text-to-image", "grok-4.1-fast"
    provider: str = ""             # e.g. "seedream", "openrouter"
    task_id: Optional[str] = None  # kie.ai taskId or workflow_id
    status: str = "pending"        # "pending" | "running" | "success" | "error"
    input_summary: str = ""        # Short summary of what was sent (truncated prompt)
    output_summary: str = ""       # Short summary of result
    error_message: Optional[str] = None
    estimated_credits: float = 0.0
    duration_ms: Optional[int] = None

    def to_dict(self) -> dict:
        return asdict(self)


def _row_to_entry(row: ApiLog) -> ApiLogEntry:
    """Convert a SQLAlchemy row to an ApiLogEntry dataclass."""
    return ApiLogEntry(
        id=row.id,
        timestamp=row.timestamp,
        call_type=row.call_type,
        model=row.model,
        provider=row.provider,
        task_id=row.task_id,
        status=row.status,
        input_summary=row.input_summary,
        output_summary=row.output_summary,
        error_message=row.error_message,
        estimated_credits=row.estimated_credits,
        duration_ms=row.duration_ms,
    )


def _row_to_dict(row: ApiLog) -> dict:
    """Convert a SQLAlchemy row to a plain dict."""
    return {
        "id": row.id,
        "timestamp": row.timestamp,
        "call_type": row.call_type,
        "model": row.model,
        "provider": row.provider,
        "task_id": row.task_id,
        "status": row.status,
        "input_summary": row.input_summary,
        "output_summary": row.output_summary,
        "error_message": row.error_message,
        "estimated_credits": row.estimated_credits,
        "duration_ms": row.duration_ms,
    }


class ApiLogger:
    """Persistent log store backed by SQLite."""

    @classmethod
    def log(cls, **kwargs) -> ApiLogEntry:
        entry = ApiLogEntry(**kwargs)
        # Auto-estimate credits if not provided
        if entry.estimated_credits == 0.0:
            entry.estimated_credits = CREDIT_ESTIMATES.get(entry.model, 0.0)

        db = SessionLocal()
        try:
            row = ApiLog(
                id=entry.id,
                timestamp=entry.timestamp,
                call_type=entry.call_type,
                model=entry.model,
                provider=entry.provider,
                task_id=entry.task_id,
                status=entry.status,
                input_summary=entry.input_summary,
                output_summary=entry.output_summary,
                error_message=entry.error_message,
                estimated_credits=entry.estimated_credits,
                duration_ms=entry.duration_ms,
            )
            db.add(row)
            db.commit()
        finally:
            db.close()

        return entry

    @classmethod
    def update(cls, log_id: str, **kwargs) -> Optional[ApiLogEntry]:
        db = SessionLocal()
        try:
            row = db.query(ApiLog).filter(ApiLog.id == log_id).first()
            if not row:
                return None
            for k, v in kwargs.items():
                if hasattr(row, k):
                    setattr(row, k, v)
            db.commit()
            db.refresh(row)
            return _row_to_entry(row)
        finally:
            db.close()

    @classmethod
    def get_all(cls, limit: int = 100, call_type: Optional[str] = None) -> List[dict]:
        db = SessionLocal()
        try:
            q = db.query(ApiLog)
            if call_type:
                q = q.filter(ApiLog.call_type == call_type)
            rows = q.order_by(desc(ApiLog.timestamp)).limit(limit).all()
            return [_row_to_dict(r) for r in rows]
        finally:
            db.close()

    @classmethod
    def get_stats(cls) -> dict:
        db = SessionLocal()
        try:
            total = db.query(func.count(ApiLog.id)).scalar() or 0
            total_credits = db.query(func.sum(ApiLog.estimated_credits)).scalar() or 0.0

            # Group by call_type
            by_type: dict = {}
            rows = db.query(
                ApiLog.call_type,
                func.count(ApiLog.id).label("count"),
                func.sum(ApiLog.estimated_credits).label("credits"),
                func.sum(func.iif(ApiLog.status == "error", 1, 0)).label("errors"),
            ).group_by(ApiLog.call_type).all()

            for r in rows:
                ct = r.call_type or "unknown"
                by_type[ct] = {
                    "count": r.count,
                    "credits": round(float(r.credits or 0), 4),
                    "errors": r.errors or 0,
                }

            return {
                "total_calls": total,
                "total_estimated_credits": round(float(total_credits), 4),
                "by_type": by_type,
            }
        finally:
            db.close()

    @classmethod
    def clear(cls) -> None:
        db = SessionLocal()
        try:
            db.query(ApiLog).delete()
            db.commit()
        finally:
            db.close()
