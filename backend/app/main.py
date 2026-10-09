from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.database import get_db_session
from app.routers.analyses import router as analyses_router
from app.routers.exercises import router as exercises_router
from app.routers.sessions import router as sessions_router

app = FastAPI()
app.include_router(analyses_router)
app.include_router(exercises_router)
app.include_router(sessions_router)


@app.get("/")
async def root():
    return {"message": "Hello Aaron"}

DatabaseSession = Annotated[Session, Depends(get_db_session)]

@app.get("/health/db")
def database_health(db: DatabaseSession):
    try:
        db.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )
