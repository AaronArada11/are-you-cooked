from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.schemas.exercise import ExerciseResponse


router = APIRouter(
    prefix="/exercises",
    tags=["Exercises"],
)

PUBLIC_EXERCISE_PATH = (
    Path(__file__).resolve().parents[1]
    / "exercises"
    / "anagrams_v1"
    / "public.json"
)


@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(exercise_id: str) -> ExerciseResponse:
    if exercise_id != "anagram-groups":
        raise HTTPException(
            status_code=404,
            detail="Exercise not found",
        )

    contents = PUBLIC_EXERCISE_PATH.read_text(encoding="utf-8")
    return ExerciseResponse.model_validate_json(contents)