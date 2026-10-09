from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


State = Literal['introduction', 'solving', 'submitted', 'feedback', 'ended']


class SessionCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    exercise_id: str = 'anagram-groups'


class Action(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Control(Action):
    kind: Literal['start', 'feedback', 'end']


class Message(Action):
    kind: Literal['message']
    text: str = Field(min_length=1, max_length=20000)


class Code(Action):
    kind: Literal['snapshot', 'test_run', 'submit']
    code: str = Field(max_length=100000)


class Hint(Action):
    kind: Literal['hint']
    text: str = Field(min_length=1, max_length=20000)


SessionAction = Annotated[Control | Message | Code | Hint, Field(discriminator='kind')]


class Event(BaseModel):
    id: UUID
    timestamp: datetime
    kind: Literal['created', 'transition', 'message', 'code_snapshot', 'hint',
                  'test_run', 'submission', 'feedback']
    data: dict[str, str | int]


class SessionRecord(BaseModel):
    id: UUID
    exercise_id: str
    exercise_version: int
    state: State = 'introduction'
    created_at: datetime
    persistence: Literal['in_memory'] = 'in_memory'
    events: list[Event]
