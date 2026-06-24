"""
CatalystScan — Auth Router
Handles login, session validation, and device registration.
"""
from fastapi import APIRouter, HTTPException, Request, Response, Depends
import database as db
from middleware import _make_token, require_admin, verify_agent_key, validate_login_origin
from models import DeviceRegister, AddScansRequest
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(tags=["auth"])
auth_limiter = Limiter(key_func=get_remote_address)


@router.post("/api/auth/login")
@auth_limiter.limit("5/minute")
async def admin_login(request: Request, response: Response, _csrf=Depends(validate_login_origin)):
    """Authenticate user for dashboard access."""
    data = await request.json()
    username = data.get("username", "").strip()
    password = data.get("password", "")
    remember_me = data.get("remember_me", False)
    client_ip = request.client.host if request.client else "unknown"

    user = db.authenticate_user(username, password)
    if user:
        db.log_audit_event(None, username, "LOGIN_SUCCESS", "auth", None, client_ip)
        token = _make_token(user["display_name"], user["role"], user.get("partner_id"), user.get("org_id"), remember_me=remember_me)
        return {
            "success": True,
            "token": token,
            "username": user["display_name"],
            "role": user["role"],
            "partner_id": user.get("partner_id"),
            "org_id": user.get("org_id"),
        }

    db.log_audit_event(None, username, "LOGIN_FAILED", "auth", None, client_ip)
    raise HTTPException(status_code=401, detail="Invalid username or password")


@router.get("/api/auth/session")
async def check_session(user=Depends(require_admin)):
    """Validate current session and return user info."""
    return {
        "valid": True,
        "username": user["username"],
        "role": user["role"],
        "partner_id": user.get("partner_id"),
        "org_id": user.get("org_id"),
    }


@router.post("/api/register")
async def register_device(request: Request, payload: DeviceRegister, _agent=Depends(verify_agent_key)):
    """Register a new device or return existing registration."""
    device = db.register_device(
        fingerprint=payload.fingerprint,
        hostname=payload.hostname,
        org_id=payload.org_id,
        org_name=payload.org_name,
        default_scan_limit=payload.default_scan_limit,
    )
    return device


@router.get("/api/license/{fingerprint}")
async def get_license(fingerprint: str, _agent=Depends(verify_agent_key)):
    """Check remaining scan count for a device."""
    device = db.get_device_license(fingerprint)
    if not device:
        raise HTTPException(status_code=404, detail="Device not registered")
    return {
        "fingerprint": fingerprint,
        "total_scans": device["total_scans"],
        "scans_used": device["scans_used"],
        "scans_remaining": device["scans_remaining"],
    }


@router.post("/api/scan/consume/{fingerprint}")
async def consume_scan(fingerprint: str, _agent=Depends(verify_agent_key)):
    """Consume one scan credit before running a scan."""
    authorized = db.consume_scan(fingerprint)
    return {"authorized": authorized, "fingerprint": fingerprint}


@router.post("/api/license/add")
async def add_scans(payload: AddScansRequest, _admin=Depends(require_admin)):
    """Admin: Add scan credits to a device."""
    db.add_scans(payload.fingerprint, payload.count)
    device = db.get_device_license(payload.fingerprint)
    return {
        "success": True,
        "fingerprint": payload.fingerprint,
        "total_scans": device["total_scans"] if device else 0,
        "scans_remaining": device["scans_remaining"] if device else 0,
    }
