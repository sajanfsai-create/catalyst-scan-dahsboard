"""
CatalystScan — Admin Router
Super admin endpoints: users, partners, DB explorer, site settings, audit log.
"""
import json
import datetime
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

import database as db
import exe_builder
from middleware import require_admin, require_super_admin, require_partner_or_admin
from models import BuildExeRequest
from config import VALID_TABLE_MAP

router = APIRouter(tags=["admin"])


# ── Pydantic Models (admin-specific) ──

class PartnerCreate(BaseModel):
    name: str
    code: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None

class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[int] = None

class UserCreate(BaseModel):
    username: str
    password: str
    display_name: str
    role: str
    partner_id: Optional[int] = None
    org_id: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    display_name: Optional[str] = None
    role: Optional[str] = None
    partner_id: Optional[int] = None
    org_id: Optional[str] = None
    is_active: Optional[int] = None


# ══════════════════════════════════════════
# DATABASE EXPLORER
# ══════════════════════════════════════════

@router.get("/api/admin/database/{table_name}")
async def get_database_table(table_name: str, _admin=Depends(require_super_admin)):
    safe_table = VALID_TABLE_MAP.get(table_name)
    if not safe_table:
        raise HTTPException(status_code=400, detail="Invalid table name")
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cursor:
            if safe_table == "users":
                cursor.execute("SELECT id, username, display_name, role, partner_id, org_id, is_active, created_at, last_login FROM users LIMIT 100")
            else:
                cursor.execute(f"SELECT * FROM `{safe_table}` LIMIT 100")
            return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/api/admin/database/all/{table_name}")
async def get_global_database_table(table_name: str, _admin=Depends(require_super_admin)):
    safe_table = VALID_TABLE_MAP.get(table_name)
    if not safe_table:
        raise HTTPException(status_code=400, detail="Invalid table name")
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cursor:
            if safe_table == "users":
                cursor.execute("SELECT id, username, display_name, role, partner_id, org_id, is_active, created_at, last_login FROM users LIMIT 1000")
            else:
                cursor.execute(f"SELECT * FROM `{safe_table}` LIMIT 1000")
            return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ══════════════════════════════════════════
# SITE SETTINGS & AUDIT LOG
# ══════════════════════════════════════════

@router.get("/api/admin/audit-log")
async def get_audit_log_endpoint(
    limit: int = 100,
    offset: int = 0,
    username: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    _admin=Depends(require_super_admin),
):
    """Get audit logs with optional filtering and pagination."""
    return db.get_audit_logs(
        limit=limit,
        offset=offset,
        username=username,
        action=action,
        date_from=date_from,
        date_to=date_to,
    )

@router.get("/api/admin/site-settings")
async def get_site_settings(_admin=Depends(require_super_admin)):
    return db.get_all_site_settings()

@router.put("/api/admin/site-settings")
async def update_site_settings(request: Request, _admin=Depends(require_super_admin)):
    data = await request.json()
    username = _admin.get("username", "system")
    for key, value in data.items():
        db.set_site_setting(key, str(value), updated_by=username)
    db.log_audit_event(None, username, "SITE_SETTINGS_UPDATED", "site_settings", None, json.dumps(list(data.keys())))
    return {"success": True}


# ══════════════════════════════════════════
# PARTNER MANAGEMENT
# ══════════════════════════════════════════

@router.post("/api/admin/partners")
async def create_partner(data: PartnerCreate, _admin=Depends(require_super_admin)):
    result = db.create_partner(name=data.name, code=data.code, contact_name=data.contact_name,
                               contact_email=data.contact_email, contact_phone=data.contact_phone, address=data.address)
    if not result:
        raise HTTPException(status_code=400, detail="Partner code already exists")
    return result

@router.get("/api/admin/partners")
async def list_partners(_admin=Depends(require_super_admin)):
    return db.list_partners()

@router.get("/api/admin/partners/{partner_id}")
async def get_partner(partner_id: int, _admin=Depends(require_super_admin)):
    partner = db.get_partner(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    partner["orgs"] = db.get_orgs_by_partner(partner_id)
    partner["stats"] = db.get_partner_stats(partner_id)
    return partner

@router.put("/api/admin/partners/{partner_id}")
async def update_partner(partner_id: int, data: PartnerUpdate, _admin=Depends(require_super_admin)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    db.update_partner(partner_id, **updates)
    return {"success": True}

@router.delete("/api/admin/partners/{partner_id}")
async def delete_partner(partner_id: int, _admin=Depends(require_super_admin)):
    db.delete_partner(partner_id)
    return {"success": True}

@router.post("/api/admin/partners/{partner_id}/assign-org")
async def assign_org(partner_id: int, request: Request, _admin=Depends(require_super_admin)):
    data = await request.json()
    org_id = data.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="org_id required")
    db.assign_org_to_partner(org_id, partner_id)
    return {"success": True}

@router.post("/api/admin/partners/{partner_id}/unassign-org")
async def unassign_org(partner_id: int, request: Request, _admin=Depends(require_super_admin)):
    data = await request.json()
    org_id = data.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="org_id required")
    db.unassign_org_from_partner(org_id)
    return {"success": True}


# ══════════════════════════════════════════
# USER MANAGEMENT
# ══════════════════════════════════════════

@router.post("/api/admin/users")
async def create_user(data: UserCreate, _admin=Depends(require_super_admin)):
    result = db.create_user(username=data.username, password=data.password,
                            display_name=data.display_name, role=data.role,
                            partner_id=data.partner_id, org_id=data.org_id)
    if not result:
        raise HTTPException(status_code=400, detail="Username already exists")
    return result

@router.get("/api/admin/users")
async def list_users(_admin=Depends(require_super_admin)):
    return db.list_users()

@router.put("/api/admin/users/{user_id}")
async def update_user(user_id: int, data: UserUpdate, _admin=Depends(require_super_admin)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    db.update_user(user_id, **updates)
    return {"success": True}

@router.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int, _admin=Depends(require_super_admin)):
    db.delete_user(user_id)
    return {"success": True}

class ResetPasswordRequest(BaseModel):
    new_password: str

@router.post("/api/admin/users/{user_id}/reset-password")
async def reset_user_password(user_id: int, data: ResetPasswordRequest, _admin=Depends(require_super_admin)):
    """Admin: Reset a user's password."""
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    success = db.update_user(user_id, password=data.new_password)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": "Password reset successfully"}


# ══════════════════════════════════════════
# PARTNER PORTAL (Partner-scoped)
# ══════════════════════════════════════════

@router.get("/api/partner/dashboard")
async def partner_dashboard(user=Depends(require_partner_or_admin)):
    partner_id = user.get("partner_id")
    if not partner_id:
        raise HTTPException(status_code=400, detail="No partner linked to this account")
    stats = db.get_partner_stats(partner_id)
    partner = db.get_partner(partner_id)
    credits = db.get_partner_credit_balance(partner_id)
    return {"partner": partner, "stats": stats, "credits": credits}

@router.get("/api/partner/orgs")
async def partner_orgs(user=Depends(require_partner_or_admin)):
    partner_id = user.get("partner_id")
    if not partner_id:
        raise HTTPException(status_code=400, detail="No partner linked to this account")
    return db.get_orgs_by_partner(partner_id)

@router.get("/api/partner/orgs/{org_id}/devices")
async def partner_org_devices(org_id: str, user=Depends(require_partner_or_admin)):
    partner_id = user.get("partner_id")
    if not partner_id:
        raise HTTPException(status_code=400, detail="No partner linked to this account")
    orgs = db.get_orgs_by_partner(partner_id)
    org_ids = [o["id"] for o in orgs]
    if org_id not in org_ids:
        raise HTTPException(status_code=403, detail="Organization not assigned to your account")
    return db.get_all_devices(org_id)

@router.get("/api/partner/downloads")
async def partner_downloads(user=Depends(require_partner_or_admin)):
    partner_id = user.get("partner_id")
    if not partner_id:
        raise HTTPException(status_code=400, detail="No partner linked to this account")
    orgs = db.get_orgs_by_partner(partner_id)
    org_names = {o["name"].lower().replace(" ", "_") for o in orgs}
    all_builds = exe_builder.list_generated_builds()
    matched = [b for b in all_builds if any(on in b["filename"].lower() for on in org_names)]
    return matched if matched else all_builds


# ══════════════════════════════════════════
# CREDIT SYSTEM (₹25/scan)
# ══════════════════════════════════════════

class AddCreditsRequest(BaseModel):
    partner_id: int
    amount_inr: float

class AllocateCreditsRequest(BaseModel):
    org_id: str
    credits: int

@router.post("/api/admin/credits/add")
async def add_credits(data: AddCreditsRequest, user=Depends(require_super_admin)):
    """Super admin: Add ₹ credits to a partner (auto-converts to scan count at ₹25/scan)."""
    result = db.add_credits_to_partner(data.partner_id, data.amount_inr, created_by=user.get("username"))
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@router.post("/api/partner/credits/allocate")
async def allocate_credits(data: AllocateCreditsRequest, user=Depends(require_partner_or_admin)):
    """Partner: Allocate credits from their pool to an end-customer org."""
    partner_id = user.get("partner_id")
    if not partner_id and user.get("role") == "super_admin":
        raise HTTPException(status_code=400, detail="Super admin must use the partner credit add endpoint")
    if not partner_id:
        raise HTTPException(status_code=400, detail="No partner linked to this account")
    result = db.allocate_credits_to_org(partner_id, data.org_id, data.credits, created_by=user.get("username"))
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@router.get("/api/credits/balance")
async def get_credit_balance(user=Depends(require_admin)):
    """Get credit balance — scoped to role."""
    role = user.get("role")
    if role == "super_admin":
        # Return all partner balances
        partners = db.list_partners()
        for p in partners:
            p["credits"] = db.get_partner_credit_balance(p["id"])
        return {"partners": partners, "cost_per_scan": db.COST_PER_SCAN_INR}
    elif role == "partner":
        partner_id = user.get("partner_id")
        if not partner_id:
            return {"error": "No partner linked"}
        balance = db.get_partner_credit_balance(partner_id)
        orgs = db.get_orgs_by_partner(partner_id)
        for o in orgs:
            o["credits"] = db.get_org_credit_balance(o["id"])
        return {"balance": balance, "orgs": orgs}
    elif role == "end_customer":
        org_id = user.get("org_id")
        if not org_id:
            return {"error": "No org linked"}
        return db.get_org_credit_balance(org_id)
    return {"error": "Unknown role"}

@router.get("/api/credits/ledger")
async def get_credit_ledger(user=Depends(require_admin)):
    """Get credit transaction history — scoped to role."""
    role = user.get("role")
    if role == "super_admin":
        return {"ledger": db.get_credit_ledger(limit=100)}
    elif role == "partner":
        partner_id = user.get("partner_id")
        return {"ledger": db.get_credit_ledger(partner_id=partner_id)}
    elif role == "end_customer":
        org_id = user.get("org_id")
        return {"ledger": db.get_credit_ledger(org_id=org_id)}
    return {"ledger": []}

