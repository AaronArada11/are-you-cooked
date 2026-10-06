from uuid import UUID
from typing import Optional
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

class AnalysisCreate(BaseModel):
    profile_id: UUID

    job_title: Optional[str] = Field(default=None, max_length=200)
    company: Optional[str] = Field(default=None, max_length=200)
    job_description: Optional[str] = None

class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    profile_id: UUID
    status: str
    job_title: Optional[str] = None
    company: Optional[str] = None
    job_description: Optional[str] = None
    ats_score: Optional[int] = None
    job_match_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime
