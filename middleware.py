"""
CatalystScan - Authentication & Authorization Middleware
Handles token creation, validation, role checks, and org scope resolution.
v2.2: Fernet-encrypted tokens with HMAC fallback for migration.
"""
import os
import datetime
import hashlib
import hmac
import base64
import json
import logging
from typing import Optional

logger = logging.getLogger("catalystscan.auth")

from fastapi import HTTPException, Request
from cryptography.fernet import Fernet, InvalidToken
from config import SESSION_SECRET, AGENT_API_KEY, TOKEN_TTL_SECONDS, REMEMBER_ME_TTL_SECONDS

# Derive a Fernet key from SESSION_SECRET (must be 32 url-safe base64 bytes)
_fernet_key = base64.urlsafe_b64encode(hashlib.sha256(SESSION_SECRET.encode()).digest())
_fernet = Fernet(_fernet_key)


# ==============================
# Token Helpers
# ==============================

def _make_token(display_name: str, role: str, partner_id=None, org_id=None, remember_me: bool=False) -> str:
    """Create a Fernet-encrypted token with role + scope info."""
    ttl = REMEMBER_ME_TTL_SECONDS if remember_me else TOKEN_TTL_SECONDS
    payload = json.dumps({
        "u": display_name,
        "r": role,
        "p": partner_id,
        "o": org_id,
        "ttl": ttl,
        "t": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })
    return _fernet.encrypt(payload.encode()).decode()


def _parse_token(token: str) -> dict:
    """Parse and validate a session token (Fernet or legacy HMAC). Returns dict with user info."""
    try:
        # Try Fernet first (new tokens) - decrypt without fixed TTL, validate TTL manually
        try:
            decrypted = _fernet.decrypt(token.encode())
            data = json.loads(decrypted.decode())
            
            created_at = datetime.datetime.fromisoformat(data.get("t"))
            # Handle tokens created before UTC migration (naive datetimes)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=datetime.timezone.utc)
            ttl = data.get("ttl", TOKEN_TTL_SECONDS)
            if (datetime.datetime.now(datetime.timezone.utc) - created_at).total_seconds() > ttl:
                raise InvalidToken("Token expired")
                
            role = data.get("r", "org_user")
            role_map = {"superadmin": "super_admin", "admin": "super_admin"}
            role = role_map.get(role, role)
            return {
                "username": data.get("u", ""),
                "role": role,
                "partner_id": data.get("p"),
                "org_id": data.get("o"),
            }
        except InvalidToken:
            pass

        # Fallback: legacy HMAC token (DEPRECATED — will be removed in v2.4)
        # These tokens use HMAC signing without encryption and have weaker security properties.
        if "." in token:
            logger.warning("Legacy HMAC token used — this format is deprecated and will be removed in v2.4. User should re-login to get a Fernet token.")
            payload_b64, signature = token.split(".", 1)
            expected_sig = hmac.new(SESSION_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(signature, expected_sig):
                raise ValueError("Invalid signature")

            payload = base64.b64decode(payload_b64).decode()
            parts = payload.split("|")
            if len(parts) == 3:
                username, role, created_at = parts
                partner_id, org_id = None, None
            elif len(parts) == 5:
                username, role, partner_id, org_id, created_at = parts
                partner_id = int(partner_id) if partner_id else None
                org_id = org_id if org_id else None
            else:
                raise ValueError("Invalid token format")

            created = datetime.datetime.fromisoformat(created_at)
            if created.tzinfo is None:
                created = created.replace(tzinfo=datetime.timezone.utc)
            if (datetime.datetime.now(datetime.timezone.utc) - created).total_seconds() > 86400:
                raise HTTPException(status_code=401, detail="Session expired")

            role_map = {"superadmin": "super_admin", "admin": "super_admin"}
            role = role_map.get(role, role)
            return {"username": username, "role": role, "partner_id": partner_id, "org_id": org_id}

        raise ValueError("Unrecognized token format")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session token")


# ==============================
# FastAPI Dependencies
# ==============================

async def require_admin(request: Request):
    """FastAPI dependency: validates any authenticated user."""
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.query_params.get("token")
    if not token:
        token = request.headers.get("X-Auth-Token")

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    return _parse_token(token)


async def require_super_admin(request: Request):
    """FastAPI dependency: only super_admin role."""
    user = await require_admin(request)
    if user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


async def require_partner_or_admin(request: Request):
    """FastAPI dependency: partner or super_admin role."""
    user = await require_admin(request)
    if user["role"] not in ("super_admin", "partner"):
        raise HTTPException(status_code=403, detail="Partner or admin access required")
    return user


async def verify_agent_key(request: Request):
    """FastAPI dependency: validates requests from scanner agents."""
    key = request.headers.get("X-Agent-Key")
    if key != AGENT_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing agent key")


async def validate_login_origin(request: Request):
    """FastAPI dependency: CSRF check for login endpoint."""
    origin = request.headers.get("origin", "")
    if origin:
        allowed = os.environ.get("ALLOWED_ORIGINS", "").split(",")
        allowed = [o.strip().rstrip("/") for o in allowed if o.strip()]
        if allowed and origin.rstrip("/") not in allowed:
            raise HTTPException(status_code=403, detail="Origin not allowed")


def resolve_org_scope(user: dict, requested_org_id: Optional[str] = None) -> Optional[str]:
    """Resolve organization scope based on user role.
    
    - super_admin: can access any org (pass-through)
    - partner: restricted to their assigned orgs only
    - org_user/end_customer: locked to their own org_id from token
    
    Returns:
        org_id string, or a sentinel like __PARTNER_SCOPE__:<id> for multi-org partner queries.
    """
    role = user.get("role", "")
    
    if role in ("org_user", "end_customer"):
        token_org = user.get("org_id")
        if not token_org:
            return "__NO_ORG_ASSIGNED__"  # Sentinel -> returns empty results
        return token_org  # Always override, ignore request param
    
    if role == "partner":
        partner_id = user.get("partner_id")
        if not partner_id:
            return "__NO_ORG_ASSIGNED__"
        if requested_org_id:
            # Verify the requested org belongs to this partner
            import database as db
            orgs = db.get_orgs_by_partner(partner_id)
            org_ids = [o["id"] for o in orgs]
            if requested_org_id not in org_ids:
                return "__NO_ORG_ASSIGNED__"  # Block access to other partner's orgs
            return requested_org_id
        # No specific org requested -> return partner sentinel for multi-org query
        return f"__PARTNER_SCOPE__:{partner_id}"
    
    return requested_org_id  # super_admin can access any org

