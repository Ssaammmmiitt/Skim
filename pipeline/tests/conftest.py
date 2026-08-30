from pathlib import Path

import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "integration: tests that call live external APIs or the database"
    )


def pytest_collection_modifyitems(config, items):
    for item in items:
        if "test_run_id" in item.fixturenames:
            item.add_marker(pytest.mark.integration)
