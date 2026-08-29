from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "integration: tests that call live external APIs"
    )
