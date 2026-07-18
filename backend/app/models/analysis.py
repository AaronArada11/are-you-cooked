from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid4,
    )
    
    profile_id: Mapped[UUID] = mapped_column (
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="queued",
    )

    created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
    onupdate=func.now(),
    nullable=False,
    )

    job_title: Mapped[Optional[str]] = mapped_column(String(200))
    
    company: Mapped[Optional[str]] = mapped_column(String(200))

    job_description: Mapped[Optional[str]] = mapped_column(Text)

    ats_score: Mapped[Optional[int]] = mapped_column(Integer)

    job_match_score: Mapped[Optional[int]] = mapped_column(Integer)

    source_file_expires_at: Mapped[Optional[datetime]] = mapped_column(
    DateTime(timezone=True)
    )

