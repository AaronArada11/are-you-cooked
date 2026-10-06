from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db_session
from app.models.analysis import Analysis
from app.models.profile import Profile
from app.schemas.analysis import AnalysisCreate, AnalysisResponse

from uuid import UUID

router = APIRouter(
    prefix="/analyses",
    tags=["Analyses"],
)


@router.post(
    "",
    response_model=AnalysisResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_analysis(
    payload: AnalysisCreate,
    db: Session = Depends(get_db_session),
):
    try:
        profile = db.get(Profile, payload.profile_id)

        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found",
            )

        new_analysis = Analysis(
            profile=profile,
            status="queued",
            job_title=payload.job_title,
            company=payload.company,
            job_description=payload.job_description,
        )

        db.add(new_analysis)
        db.commit()
        db.refresh(new_analysis)
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create analysis",
        ) from error

    return new_analysis


@router.get(
    "/{analysis_id}",
    response_model=AnalysisResponse,
)
def get_analysis(
    analysis_id: UUID,
    db: Session = Depends(get_db_session),
):
    try:
        analysis = db.get(Analysis, analysis_id)
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve analysis",
        ) from error

    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )

    return analysis
