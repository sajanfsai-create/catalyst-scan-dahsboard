"""
CatalystScan — Notifications Router
Admin endpoints for email notification configuration and testing.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel

from middleware import require_admin, require_super_admin
from notifications import get_smtp_config, send_email

logger = logging.getLogger(__name__)

router = APIRouter(tags=["notifications"])


# ── Pydantic Models ──

class TestEmailRequest(BaseModel):
    to_email: str


# ══════════════════════════════════════════
# NOTIFICATION SETTINGS
# ══════════════════════════════════════════

@router.get("/api/admin/notification-settings")
async def get_notification_settings(_admin=Depends(require_admin)):
    """Get the current SMTP configuration status (passwords masked)."""
    config = get_smtp_config()

    return {
        "smtp_configured": bool(config["host"] and config["user"] and config["password"]),
        "config": {
            "host": config["host"] or "",
            "port": config["port"],
            "user": config["user"] or "",
            "from_addr": config["from_addr"],
            "use_tls": config["use_tls"],
        }
    }


@router.post("/api/admin/notification-settings/test")
async def test_email(
    request: TestEmailRequest,
    background_tasks: BackgroundTasks,
    _admin=Depends(require_super_admin),
):
    """Send a test email to verify SMTP configuration."""
    config = get_smtp_config()
    if not config["host"] or not config["user"] or not config["password"]:
        raise HTTPException(
            status_code=400,
            detail="SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env",
        )

    username = _admin.get("username", "system")
    subject = "CatalystScan — SMTP Test Notification"
    html = (
        "<html><body>"
        "<h2>CatalystScan SMTP Verification</h2>"
        "<p>Your SMTP configuration is working correctly.</p>"
        "<p>Triggered by: <strong>" + username + "</strong></p>"
        "</body></html>"
    )

    background_tasks.add_task(send_email, request.to_email, subject, html)
    return {"message": "Test email queued. Please check your inbox."}
