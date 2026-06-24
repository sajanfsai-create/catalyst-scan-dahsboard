"""
CatalystScan — Compliance Router (DPDPA 2023)
Data export, purge, privacy policy, and grievance officer endpoints.
"""
import json
import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse

import database as db
from middleware import require_admin, require_super_admin, resolve_org_scope

router = APIRouter(tags=["compliance"])


@router.get("/api/dashboard/data-export/{org_id}")
async def export_org_data(org_id: str, _admin=Depends(require_admin)):
    """DPDPA Right to Access: Export all data for an organization."""
    scoped_org = resolve_org_scope(_admin, org_id)
    devices = db.get_all_devices(scoped_org)
    alerts = db.get_tamper_alerts_by_org(scoped_org)
    db.log_audit_event(None, _admin.get("username", "System"), "DATA_EXPORTED", "organization", scoped_org)
    return {"org_id": scoped_org, "devices_count": len(devices), "devices": devices, "alerts": alerts}


@router.delete("/api/dashboard/org/{org_id}/purge")
async def purge_org_data(org_id: str, _admin=Depends(require_super_admin)):
    """DPDPA Right to Erasure: Hard delete all org data. Super admin only."""
    success = db.hard_delete_org_data(org_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to purge data")
    db.log_audit_event(None, _admin.get("username", "System"), "DATA_PURGED", "organization", org_id)
    return {"success": True, "message": "All data permanently erased"}


@router.get("/api/public/grievance-officer")
async def get_grievance_officer():
    """Public endpoint: returns grievance officer contact for privacy page."""
    name = db.get_site_setting("grievance_officer_name", "Not configured")
    email = db.get_site_setting("grievance_officer_email", "Not configured")
    phone = db.get_site_setting("grievance_officer_phone", "")
    sla = db.get_site_setting("grievance_response_sla", "72 hours")
    return {"name": name, "email": email, "phone": phone, "response_sla": sla}


@router.get("/privacy", response_class=HTMLResponse)
async def privacy_policy():
    """Serve DPDPA-compliant privacy notice."""
    privacy_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dashboard", "privacy.html")
    if os.path.exists(privacy_path):
        with open(privacy_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return "Privacy policy not found."
