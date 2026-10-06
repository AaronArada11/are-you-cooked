import os
from pathlib import Path
import subprocess
import sys


def test_offline_migrations_accept_encoded_credentials_from_another_directory(tmp_path):
    config = Path(__file__).resolve().parents[1] / "alembic.ini"
    environment = {
        **os.environ,
        "DATABASE_URL": "postgresql+psycopg://test:encoded%40password@db/offline_test",
    }
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", str(config), "upgrade", "head", "--sql"],
        cwd=tmp_path,
        env=environment,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert "CREATE TABLE profiles" in result.stdout
    assert "ADD COLUMN created_at" in result.stdout
