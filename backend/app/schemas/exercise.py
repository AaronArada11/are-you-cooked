from pydantic import BaseModel, Field


class ExerciseExample(BaseModel):
    words: list[str]
    expected: list[list[str]]
    explanation: str


class ExerciseResponse(BaseModel):
    id: str
    version: int = Field(ge=1)
    title: str
    language: str
    statement: str
    requirements: list[str]
    constraints: list[str]
    examples: list[ExerciseExample]
    starter_code: str