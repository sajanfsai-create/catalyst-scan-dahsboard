"""
CatalystScan — Customer Portal Router
End-customer viewer endpoints: summary dashboard, device details, optimization view.
Read-only access scoped to the customer's organization.
"""
from fastapi import APIRouter, HTTPException, Depends

import database as db
from middleware import require_admin

router = APIRouter(tags=["customer"])


def _require_customer_or_above(user):
    """Verify user has at least end_customer access."""
    if user["role"] not in ("super_admin", "partner", "org_user", "end_customer"):
        raise HTTPException(status_code=403, detail="Access denied")
    return user


def _resolve_customer_org(user, requested_org_id=None):
    """Resolve org_id based on role. End customers are always locked to their own org."""
    role = user.get("role", "")
    
    if role in ("end_customer", "org_user"):
        org_id = user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=400, detail="No organization linked to this account")
        return org_id
    
    if role == "partner":
        partner_id = user.get("partner_id")
        if requested_org_id and partner_id:
            orgs = db.get_orgs_by_partner(partner_id)
            org_ids = [o["id"] for o in orgs]
            if requested_org_id not in org_ids:
                raise HTTPException(status_code=403, detail="Access denied to this organization")
            return requested_org_id
        raise HTTPException(status_code=400, detail="org_id parameter required for partner accounts")
    
    # super_admin
    if requested_org_id:
        return requested_org_id
    raise HTTPException(status_code=400, detail="org_id parameter required")


@router.get("/api/customer/summary")
async def customer_summary(org_id: str = None, user=Depends(require_admin)):
    """Get a complete dashboard summary for the customer's organization.
    
    Returns: org info, device list with health scores, credit balance,
    and aggregated optimization potential (software vs hardware).
    """
    _require_customer_or_above(user)
    resolved_org = _resolve_customer_org(user, org_id)
    
    summary = db.get_customer_summary(resolved_org)
    if not summary:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return summary


@router.get("/api/customer/device/{fingerprint}")
async def customer_device_detail(fingerprint: str, user=Depends(require_admin)):
    """Get device detail for a specific device — scoped to the customer's org."""
    _require_customer_or_above(user)
    
    device = db.get_device_license(fingerprint)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Scope check: device must belong to user's org
    role = user.get("role", "")
    if role in ("end_customer", "org_user"):
        if device.get("org_id") != user.get("org_id"):
            raise HTTPException(status_code=403, detail="Access denied")
    elif role == "partner":
        partner_id = user.get("partner_id")
        if partner_id:
            orgs = db.get_orgs_by_partner(partner_id)
            org_ids = [o["id"] for o in orgs]
            if device.get("org_id") not in org_ids:
                raise HTTPException(status_code=403, detail="Access denied")
    
    # Get latest scan summary (no raw data blob — just scores)
    latest = db.get_latest_scan(fingerprint)
    scan_summary = None
    if latest:
        scan_summary = {
            "overall_score": latest.get("overall_score"),
            "overall_grade": latest.get("overall_grade"),
            "timestamp": latest.get("timestamp"),
        }
    
    # Get latest system audit for optimization potential
    audit_summary = None
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM system_audits WHERE fingerprint = %s ORDER BY scanned_at DESC LIMIT 1",
                (fingerprint,)
            )
            audit = cursor.fetchone()
            if audit:
                audit_summary = {
                    "software_boost_pct": audit.get("software_boost_pct", 0),
                    "hardware_boost_pct": audit.get("hardware_boost_pct", 0),
                    "security_score": audit.get("security_score", 0),
                    "temp_waste_gb": audit.get("temp_waste_gb", 0),
                    "bloatware_count": audit.get("bloatware_count", 0),
                }
    finally:
        conn.close()
    
    return {
        "device": {
            "hostname": device.get("hostname"),
            "fingerprint": device.get("fingerprint"),
            "org_name": device.get("org_name"),
            "online": device.get("online", False),
            "last_seen": device.get("last_seen"),
            "total_scans": device.get("total_scans", 0),
            "scans_used": device.get("scans_used", 0),
            "scans_remaining": device.get("scans_remaining", 0),
        },
        "scan_summary": scan_summary,
        "optimization": audit_summary,
    }
