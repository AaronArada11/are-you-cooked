from uuid import uuid4
from unittest.mock import Mock

import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db_session
from app.main import app
from app.models import Analysis, Profile


@pytest.fixture
def profile(db):
    profile = Profile(id=uuid4())
    db.add(profile)
    db.commit()
    return profile


def test_create_and_retrieve_analysis(client, profile):
    payload = {
        "profile_id": str(profile.id),
        "job_title": "Python developer",
        "company": "Synthetic fixture",
        "job_description": "Authored test data",
    }
    response = client.post("/analyses", json=payload)
    assert response.status_code == 201
    created = response.json()
    assert all(created[key] == value for key, value in payload.items())
    assert created["status"] == "queued"
    assert created["ats_score"] is None
    assert created["job_match_score"] is None
    assert created["created_at"] and created["updated_at"]
    retrieved = client.get(f"/analyses/{created['id']}")
    assert retrieved.status_code == 200
    assert retrieved.json() == created


def test_minimal_analysis(client, profile):
    response = client.post("/analyses", json={"profile_id": str(profile.id)})
    assert response.status_code == 201
    assert response.json()["job_title"] is None


@pytest.mark.parametrize("field", ["job_title", "company"])
def test_database_string_length_boundary(client, db, profile, field):
    payload = {"profile_id": str(profile.id), field: "x" * 201}
    response = client.post("/analyses", json=payload)
    assert response.status_code == 422
    assert db.scalar(select(Analysis.id)) is None
    payload[field] = "x" * 200
    assert client.post("/analyses", json=payload).status_code == 201


def test_missing_profile(client):
    response = client.post("/analyses", json={"profile_id": str(uuid4())})
    assert response.status_code == 404
    assert response.json()["detail"] == "Profile not found"


def test_missing_analysis(client):
    response = client.get(f"/analyses/{uuid4()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Analysis not found"


def test_invalid_ids(client):
    assert client.get("/analyses/not-a-uuid").status_code == 422
    assert client.post("/analyses", json={"profile_id": "bad"}).status_code == 422
    assert client.post("/analyses", json={}).status_code == 422


def test_database_cascades_profile_deletion(client, db, profile):
    response = client.post("/analyses", json={"profile_id": str(profile.id)})
    assert response.status_code == 201
    # Bulk SQL deliberately bypasses the ORM relationship cascade.
    db.execute(delete(Profile).where(Profile.id == profile.id))
    db.commit()
    assert client.get(f"/analyses/{response.json()['id']}").status_code == 404


@pytest.mark.parametrize("operation", ["profile_lookup", "commit", "refresh", "retrieve"])
def test_database_errors_return_safe_json_and_rollback(client, profile, operation):
    broken = Mock()
    broken.get.return_value = profile
    method = {"profile_lookup": "get", "retrieve": "get"}.get(operation, operation)
    getattr(broken, method).side_effect = SQLAlchemyError("private database details")
    app.dependency_overrides[get_db_session] = lambda: broken
    if operation == "retrieve":
        response = client.get(f"/analyses/{uuid4()}")
        expected = "Could not retrieve analysis"
    else:
        response = client.post("/analyses", json={"profile_id": str(profile.id)})
        expected = "Could not create analysis"
    assert response.status_code == 500
    assert response.json() == {"detail": expected}
    broken.rollback.assert_called_once()


def test_health(client):
    assert client.get("/").status_code == 200
    response = client.get("/health/db")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "database": "connected"}


def test_database_health_failure(client):
    broken = Mock()
    broken.execute.side_effect = SQLAlchemyError("private database details")
    app.dependency_overrides[get_db_session] = lambda: broken
    response = client.get("/health/db")
    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}
