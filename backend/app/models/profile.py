from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[UUID] = mapped_column(
        Uuid,
        primary_key=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    analyses = relationship(
        "Analysis",
        back_populates="profile",
        cascade="all, delete",
        passive_deletes=True,
    )