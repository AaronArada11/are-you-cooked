from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.routers.exercises import get_exercise
from app.schemas.session import SessionAction, SessionCreate, SessionRecord
from app.sessions import MemorySessionStore, SessionConflict

router = APIRouter(prefix='/sessions', tags=['Sessions'])
store = MemorySessionStore()


@router.post('', response_model=SessionRecord, status_code=201)
def create_session(payload: SessionCreate):
    return store.create(get_exercise(payload.exercise_id))


@router.get('/{session_id}', response_model=SessionRecord)
def get_session(session_id: UUID):
    try:
        return store.get(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail='Session not found')


@router.post('/{session_id}/events', response_model=SessionRecord)
def record_event(session_id: UUID, action: SessionAction):
    try:
        return store.apply(session_id, action)
    except KeyError:
        raise HTTPException(status_code=404, detail='Session not found')
    except SessionConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc))
