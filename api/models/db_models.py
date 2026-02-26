"""SQLAlchemy ORM models for persistent storage."""

from sqlalchemy import Column, String, Float, Integer, Text, Boolean, DateTime
from sqlalchemy.sql import func
from api.services.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(120), nullable=False, default="")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ApiLog(Base):
    __tablename__ = "api_logs"

    id = Column(String(12), primary_key=True, index=True)
    timestamp = Column(Float, nullable=False, index=True)
    call_type = Column(String(50), nullable=False, default="", index=True)
    model = Column(String(120), nullable=False, default="")
    provider = Column(String(60), nullable=False, default="")
    task_id = Column(String(120), nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    input_summary = Column(Text, nullable=False, default="")
    output_summary = Column(Text, nullable=False, default="")
    error_message = Column(Text, nullable=True)
    estimated_credits = Column(Float, nullable=False, default=0.0)
    duration_ms = Column(Integer, nullable=True)
