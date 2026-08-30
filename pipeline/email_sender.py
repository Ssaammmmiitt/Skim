"""Email delivery via Mailtrap HTTP API (sandbox or production)."""

from __future__ import annotations

import logging
import os

import requests

logger = logging.getLogger(__name__)

PRODUCTION_API_URL = "https://send.api.mailtrap.io/api/send"
SANDBOX_API_URL = "https://sandbox.api.mailtrap.io/api/send"
REQUEST_TIMEOUT_SECONDS = 60


def _sandbox_enabled() -> bool:
    return os.environ.get("MAILTRAP_SANDBOX", "").lower() in ("1", "true", "yes")


def _api_token() -> str:
    token = os.environ.get("MAILTRAP_API_TOKEN", "").strip()
    if not token:
        raise ValueError("MAILTRAP_API_TOKEN is not set")
    return token


def _sender_email() -> str:
    email = os.environ.get("MAILTRAP_SENDER_EMAIL", "").strip()
    if not email:
        raise ValueError(
            "MAILTRAP_SENDER_EMAIL is not set; use a verified domain address for production"
        )
    return email


def _sender_name() -> str:
    return os.environ.get("MAILTRAP_SENDER_NAME", "Skim").strip() or "Skim"


def _recipient() -> str:
    recipient = os.environ.get("DIGEST_RECIPIENT", "").strip()
    if not recipient:
        raise ValueError("DIGEST_RECIPIENT is not set")
    return recipient


def _api_url() -> str:
    return SANDBOX_API_URL if _sandbox_enabled() else PRODUCTION_API_URL


def _build_payload(*, subject: str, html: str, to: str) -> dict:
    return {
        "from": {"email": _sender_email(), "name": _sender_name()},
        "to": [{"email": to}],
        "subject": subject,
        "html": html,
        "category": "Skim Digest",
    }


def send_email(
    *,
    subject: str,
    html: str,
    to: str | None = None,
    session: requests.Session | None = None,
) -> bool:
    """Send an HTML email. Returns True on success, False on failure."""
    recipient = to or _recipient()
    http = session or requests

    try:
        response = http.post(
            _api_url(),
            headers={
                "Authorization": f"Bearer {_api_token()}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json=_build_payload(subject=subject, html=html, to=recipient),
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.error("Email send failed: %s", exc)
        return False

    if _sandbox_enabled():
        logger.info(
            "Email captured in Mailtrap sandbox (inbox %s); not delivered to %s",
            os.environ.get("MAILTRAP_INBOX_ID", "default"),
            recipient,
        )
    else:
        logger.info("Email sent to %s: %s", recipient, subject)
    return True


def send_digest_email(html: str, subject: str) -> bool:
    """Send the daily digest email."""
    return send_email(subject=subject, html=html)


def send_alert_email(subject: str, html: str) -> bool:
    """Send a pipeline failure alert."""
    return send_email(subject=subject, html=html)
