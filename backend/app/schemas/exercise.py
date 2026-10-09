from pydantic import BaseModel, Field


class ExerciseExample(BaseModel):
    words: list[str] = Field(validation_alias='input')
    expected: list[list[str]] = Field(validation_alias='output')
    explanation: str


class ExerciseResponse(BaseModel):
    id: str = Field(validation_alias='exercise_id')
    version: int = Field(ge=1, validation_alias='exercise_version')
    title: str
    language: str
    statement: str
    requirements: list[str]
    constraints: list[str]
    examples: list[ExerciseExample]
    starter_code: str
