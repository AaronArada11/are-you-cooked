"""Process-local session repository; no database or candidate-code execution."""
from datetime import datetime, timezone
from threading import Lock
from uuid import UUID, uuid4

from app.schemas.exercise import ExerciseResponse
from app.schemas.session import Event, SessionAction, SessionRecord


NEXT_STATE = {
    'introduction': 'solving', 'solving': 'submitted',
    'submitted': 'feedback', 'feedback': 'ended',
}


class SessionConflict(ValueError):
    pass


class MemorySessionStore:
    # shortcut: records disappear on restart and are process-local, replace before multi-worker deployment.
    def __init__(self):
        self._records: dict[UUID, SessionRecord] = {}
        self._lock = Lock()

    @staticmethod
    def _append(record, kind, **data):
        event = Event(id=uuid4(), timestamp=datetime.now(timezone.utc), kind=kind, data=data)
        record.events.append(event)
        return str(event.id)

    def create(self, exercise: ExerciseResponse) -> SessionRecord:
        with self._lock:
            record = SessionRecord(
                id=uuid4(), exercise_id=exercise.id, exercise_version=exercise.version,
                created_at=datetime.now(timezone.utc), events=[],
            )
            self._append(record, 'created', exercise_id=exercise.id,
                         exercise_version=exercise.version)
            self._records[record.id] = record
            return record.model_copy(deep=True)

    def get(self, session_id: UUID) -> SessionRecord:
        with self._lock:
            return self._records[session_id].model_copy(deep=True)

    def _transition(self, record, target):
        if NEXT_STATE.get(record.state) != target:
            raise SessionConflict(f'Cannot transition from {record.state} to {target}')
        previous = record.state
        record.state = target
        self._append(record, 'transition', previous=previous, state=target)

    def apply(self, session_id: UUID, action: SessionAction) -> SessionRecord:
        with self._lock:
            record = self._records[session_id]
            required = {'start': 'introduction', 'submit': 'solving',
                        'feedback': 'submitted', 'end': 'feedback'}
            allowed = ('introduction', 'solving') if action.kind == 'message' else ('solving',)
            if action.kind in required:
                allowed = (required[action.kind],)
            if record.state not in allowed:
                raise SessionConflict(f'{action.kind} is not allowed in {record.state}')

            if action.kind == 'start':
                self._transition(record, 'solving')
            elif action.kind == 'message':
                self._append(record, 'message', role='candidate', text=action.text)
            elif action.kind == 'hint':
                self._append(record, 'hint', text=action.text, status='requested',
                             delivery_status='unavailable')
            elif action.kind in ('snapshot', 'test_run', 'submit'):
                snapshot_id = self._append(record, 'code_snapshot', code=action.code,
                                           reason=action.kind)
                if action.kind == 'test_run':
                    self._append(record, 'test_run', snapshot_id=snapshot_id,
                                 status='unavailable', detail='Execution sandbox is not configured.')
                elif action.kind == 'submit':
                    self._append(record, 'submission', snapshot_id=snapshot_id)
                    self._transition(record, 'submitted')
            elif action.kind == 'feedback':
                self._append(record, 'feedback', status='unavailable',
                             detail='Feedback evaluator is not configured; insufficient evidence for assessment.')
                self._transition(record, 'feedback')
            elif action.kind == 'end':
                self._transition(record, 'ended')
            return record.model_copy(deep=True)
