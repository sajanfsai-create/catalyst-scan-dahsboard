"""
CatalystScan — Dashboard Router
Core dashboard API endpoints: stats, devices, alerts, orgs, fleet health.
"""
import json
import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import FileResponse
import os
import logging

logger = logging.getLogger(__name__)

import database as db
from middleware import require_admin, require_super_admin, resolve_org_scope
from models import CreateOrgRequest, RenameOrgRequest
from report_generator import generate_pdf_report
from config import REPORTS_DIR

router = APIRouter(tags=["dashboard"])


# ── Stats & Overview ──

@router.get("/api/dashboard/stats")
async def get_fleet_stats(org_id: Optional[str] = None, _admin=Depends(require_admin)):
    """Get aggregate fleet statistics. Returns zero defaults on empty database."""
    scoped_org = resolve_org_scope(_admin, org_id)
    try:
        result = db.get_fleet_stats(scoped_org)
        return result or {
            "total_devices": 0, "online": 0, "offline": 0,
            "active_alerts": 0, "needs_upgrade": 0
        }
    except Exception:
        return {
            "total_devices": 0, "online": 0, "offline": 0,
            "active_alerts": 0, "needs_upgrade": 0
        }


@router.get("/api/dashboard/devices")
async def get_devices(org_id: Optional[str] = None, _admin=Depends(require_admin)):
    """Get all registered devices with their status."""
    scoped_org = resolve_org_scope(_admin, org_id)
    devices = db.get_all_devices(scoped_org)
    return {"devices": devices, "total": len(devices)}


@router.get("/api/dashboard/device/{fingerprint}")
async def get_device_detail(fingerprint: str, _admin=Depends(require_admin)):
    """Get detailed info for a specific device."""
    device = db.get_device_license(fingerprint)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Partner access check: device must belong to one of their orgs
    role = _admin.get("role", "")
    if role == "partner":
        partner_id = _admin.get("partner_id")
        if partner_id:
            partner_orgs = db.get_orgs_by_partner(partner_id)
            org_ids = [o["id"] for o in partner_orgs]
            if device.get("org_id") not in org_ids:
                raise HTTPException(status_code=403, detail="Access denied")
    elif role in ("org_user", "end_customer"):
        if device.get("org_id") != _admin.get("org_id"):
            raise HTTPException(status_code=403, detail="Access denied")
    
    latest_scan = db.get_latest_scan(fingerprint)
    scan_history = db.get_scan_history(fingerprint, limit=10)
    return {"device": device, "latest_scan": latest_scan, "scan_history": scan_history}


@router.get("/api/dashboard/device/{fingerprint}/scan-history")
async def get_device_scan_history(fingerprint: str, limit: int = 20, _admin=Depends(require_admin)):
    """Get scan history for a device."""
    history = db.get_scan_history(fingerprint, limit=min(limit, 50))
    return {"fingerprint": fingerprint, "scans": history, "total": len(history)}


@router.get("/api/dashboard/device/{fingerprint}/compare")
async def compare_scans(fingerprint: str, scan1: int = 0, scan2: int = 0, _admin=Depends(require_admin)):
    """Compare two scan results side-by-side. Returns score/grade diffs and component deltas."""
    if not scan1 or not scan2:
        raise HTTPException(status_code=400, detail="Both scan1 and scan2 query parameters are required")

    s1 = db.get_scan_by_id(scan1)
    s2 = db.get_scan_by_id(scan2)

    if not s1 or not s2:
        raise HTTPException(status_code=404, detail="One or both scan IDs not found")
    if s1.get("fingerprint") != fingerprint or s2.get("fingerprint") != fingerprint:
        raise HTTPException(status_code=403, detail="Scan does not belong to this device")

    # Build comparison
    def _extract_components(health_data):
        if not health_data or not isinstance(health_data, dict):
            return {}
        components = health_data.get("components", {})
        if isinstance(components, list):
            return {c.get("name", f"component_{i}"): c for i, c in enumerate(components)}
        return components

    h1 = s1.get("health_data", {}) or {}
    h2 = s2.get("health_data", {}) or {}
    c1 = _extract_components(h1)
    c2 = _extract_components(h2)

    # Component-level diff
    all_keys = sorted(set(list(c1.keys()) + list(c2.keys())))
    component_diffs = []
    for key in all_keys:
        v1 = c1.get(key, {})
        v2 = c2.get(key, {})
        score1 = v1.get("score", 0) if isinstance(v1, dict) else 0
        score2 = v2.get("score", 0) if isinstance(v2, dict) else 0
        component_diffs.append({
            "component": key,
            "scan1_score": score1,
            "scan2_score": score2,
            "delta": score2 - score1,
        })

    return {
        "fingerprint": fingerprint,
        "scan1": {
            "id": s1.get("id"),
            "timestamp": s1.get("timestamp"),
            "overall_score": s1.get("overall_score", 0),
            "overall_grade": s1.get("overall_grade", "?"),
        },
        "scan2": {
            "id": s2.get("id"),
            "timestamp": s2.get("timestamp"),
            "overall_score": s2.get("overall_score", 0),
            "overall_grade": s2.get("overall_grade", "?"),
        },
        "score_delta": (s2.get("overall_score", 0) or 0) - (s1.get("overall_score", 0) or 0),
        "component_diffs": component_diffs,
    }


@router.get("/api/dashboard/alerts")
async def get_alerts(org_id: Optional[str] = None, include_resolved: bool = False, _admin=Depends(require_admin)):
    """Get tamper alerts. Set include_resolved=true to include resolved alerts."""
    scoped_org = resolve_org_scope(_admin, org_id)
    if scoped_org and scoped_org.startswith("__PARTNER_SCOPE__:"):
        # Partner scope: get alerts from all partner's orgs
        partner_id = int(scoped_org.split(":")[1])
        partner_orgs = db.get_orgs_by_partner(partner_id)
        alerts = []
        for org in partner_orgs:
            alerts.extend(db.get_tamper_alerts_by_org(org["id"]))
    elif scoped_org:
        alerts = db.get_tamper_alerts_by_org(scoped_org)
    else:
        alerts = db.get_tamper_alerts(resolved=False, include_all=include_resolved)
    for alert in alerts:
        if isinstance(alert.get("tamper_data"), str):
            try:
                alert["tamper_data"] = json.loads(alert["tamper_data"])
            except (json.JSONDecodeError, TypeError):
                pass
    return {"alerts": alerts, "total": len(alerts)}


@router.put("/api/dashboard/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int, _admin=Depends(require_admin)):
    """Mark a tamper alert as resolved."""
    username = _admin.get("username", "unknown")
    success = db.resolve_tamper_alert(alert_id, resolved_by=username)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found or already resolved")
    return {"success": True, "alert_id": alert_id, "resolved_by": username}


# ── Organization Management ──

@router.get("/api/dashboard/orgs")
async def get_orgs(_admin=Depends(require_admin)):
    """Get organizations — scoped to role."""
    role = _admin.get("role", "")
    if role == "partner":
        partner_id = _admin.get("partner_id")
        if partner_id:
            orgs = db.get_orgs_by_partner(partner_id)
            return {"organizations": orgs}
        return {"organizations": []}
    elif role in ("org_user", "end_customer"):
        org_id = _admin.get("org_id")
        if org_id:
            orgs = db.get_all_orgs()
            orgs = [o for o in orgs if o.get("id") == org_id]
            return {"organizations": orgs}
        return {"organizations": []}
    orgs = db.get_all_orgs()
    return {"organizations": orgs}

@router.post("/api/dashboard/orgs")
async def create_org(payload: CreateOrgRequest, _admin=Depends(require_super_admin)):
    db.create_org(org_id=payload.org_id, name=payload.name, email=payload.contact_email,
                  phone=payload.contact_phone, address=payload.address, partner_id=payload.partner_id, org_category=payload.org_category)
    return {"success": True, "org_id": payload.org_id}

@router.put("/api/dashboard/orgs/{org_id}/rename")
async def rename_org_route(org_id: str, payload: RenameOrgRequest, _admin=Depends(require_super_admin)):
    success = db.rename_organization(org_id, payload.new_name, payload.new_contact_email,
                                     payload.new_contact_phone, payload.new_address)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update organization")
    return {"success": True}

@router.delete("/api/dashboard/orgs/{org_id}")
async def delete_org(org_id: str, _admin=Depends(require_super_admin)):
    success = db.delete_organization(org_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete organization")
    return {"success": True}


# ── Organization-scoped endpoints ──

@router.get("/api/organization/{org_id}/overview")
async def get_org_overview(org_id: str, _admin=Depends(require_admin)):
    scoped_org = resolve_org_scope(_admin, org_id)
    return db.get_fleet_stats(scoped_org)

@router.get("/api/organization/{org_id}/alerts")
async def get_org_alerts(org_id: str, _admin=Depends(require_admin)):
    scoped_org = resolve_org_scope(_admin, org_id)
    alerts = db.get_tamper_alerts_by_org(scoped_org)
    return {"alerts": alerts}

@router.get("/api/organization/{org_id}/licensing")
async def get_org_licensing(org_id: str, _admin=Depends(require_admin)):
    scoped_org = resolve_org_scope(_admin, org_id)
    devices = db.get_all_devices(scoped_org)
    return {
        "org_id": scoped_org,
        "total_allocated_scans": sum(d.get('total_scans', 0) for d in devices),
        "remaining_scans": sum(d.get('scans_remaining', 0) for d in devices),
        "device_breakdown": [{"hostname": d['hostname'], "remaining": d['scans_remaining']} for d in devices]
    }


# ── Device Report ──

@router.get("/api/dashboard/device/{fingerprint}/report")
async def get_device_report(fingerprint: str, _admin=Depends(require_admin)):
    device = db.get_device_license(fingerprint)
    latest_scan = db.get_latest_scan(fingerprint)
    if not device or not latest_scan:
        raise HTTPException(status_code=404, detail="Data not available")

    org_name = device.get('org_name', 'Bostontech India')
    folder_path = os.path.join(REPORTS_DIR, org_name.replace(" ", "_"))
    os.makedirs(folder_path, exist_ok=True)
    report_filename = f"Assessment_Report_{fingerprint[:8]}.pdf"
    report_path = os.path.join(folder_path, report_filename)

    scan_timestamp = latest_scan.get('timestamp')
    scan_time = None
    if scan_timestamp:
        import datetime
        if isinstance(scan_timestamp, str):
            try:
                scan_time = datetime.datetime.fromisoformat(scan_timestamp.replace("Z", "+00:00"))
            except Exception:
                pass
        else:
            scan_time = scan_timestamp

    # Generate cost estimation data to match local report
    cost_data = None
    try:
        from pricing_db import estimate_replacement_cost
        scan_data = latest_scan.get('scan_data', {})
        health_data = latest_scan.get('health_data')
        cost_data = estimate_replacement_cost(scan_data, health_data)
    except Exception as e:
        logger.warning(f"Cost estimation skipped: {e}")

    generate_pdf_report(
        system_info=latest_scan.get('scan_data', {}),
        benchmark_info=latest_scan.get('benchmark_data', {}),
        report_path=report_path,
        health_data=latest_scan.get('health_data'),
        compatibility_data=latest_scan.get('compatibility_data'),
        org_name=org_name,
        tamper_data=latest_scan.get('tamper_data'),
        cost_data=cost_data,
        scan_time=scan_time
    )
    return FileResponse(path=report_path, filename=report_filename, media_type='application/pdf')



# ── Fleet Health ──

@router.get("/api/dashboard/fleet-health")
async def fleet_health_summary(org_id: Optional[str] = None, _admin=Depends(require_admin)):
    """Get fleet health grade distribution. Returns empty defaults on empty database."""
    scoped_org = resolve_org_scope(_admin, org_id)
    try:
        result = db.get_fleet_health_summary(scoped_org)
        return result or {
            "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0, "?": 0},
            "total_devices": 0, "healthy_count": 0, "warning_count": 0,
            "critical_count": 0, "unscanned_count": 0, "replacement_needed": []
        }
    except Exception:
        # Return safe defaults instead of 500 error
        return {
            "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0, "?": 0},
            "total_devices": 0, "healthy_count": 0, "warning_count": 0,
            "critical_count": 0, "unscanned_count": 0, "replacement_needed": []
        }

@router.get("/api/dashboard/device/{fingerprint}/health")
async def device_health_detail(fingerprint: str, _admin=Depends(require_admin)):
    scan = db.get_latest_scan(fingerprint)
    if not scan:
        return {
            "fingerprint": fingerprint,
            "overall_grade": "?",
            "overall_score": 0,
            "scan_timestamp": None,
            "health": {},
            "system_summary": {},
            "no_scan_data": True,
        }
    health = scan.get("health_data", {})
    scan_data = scan.get("scan_data", {})
    return {
        "fingerprint": fingerprint,
        "overall_grade": scan.get("overall_grade", "?"),
        "overall_score": scan.get("overall_score", 0),
        "scan_timestamp": scan.get("timestamp"),
        "health": health,
        "system_summary": {
            "hostname": scan_data.get("os", {}).get("hostname", "Unknown"),
            "cpu": scan_data.get("cpu", {}).get("brand", "Unknown"),
            "ram_gb": scan_data.get("ram", {}).get("total_gb", 0),
            "primary_disk": (scan_data.get("storage", {}).get("drives", [{}]) or [{}])[0].get("model", "Unknown"),
            "os": scan_data.get("os", {}).get("os_name", "Unknown"),
        },
    }


# ── Feature Flags ──

@router.post("/api/dashboard/features")
async def set_feature(request: Request, _admin=Depends(require_super_admin)):
    data = await request.json()
    org_id = data.get("org_id")
    feature = data.get("feature_name")
    enabled = data.get("enabled", True)
    duration_days = data.get("duration_days")
    if not org_id or not feature:
        raise HTTPException(status_code=400, detail="org_id and feature_name required")
    success = db.set_feature_flag(org_id, feature, enabled, duration_days)
    return {"success": success}

@router.get("/api/dashboard/features/{org_id}")
async def get_features(org_id: str, _admin=Depends(require_admin)):
    scoped_org = resolve_org_scope(_admin, org_id)
    return db.get_org_features(scoped_org)


# ── Bulk License ──

@router.post("/api/dashboard/bulk-license")
async def bulk_add_scans(request: Request, _admin=Depends(require_super_admin)):
    import csv, io
    data = await request.json()
    csv_content = data.get("csv", "")
    count = data.get("count", 2)
    if not csv_content:
        raise HTTPException(status_code=400, detail="CSV content required")
    reader = csv.reader(io.StringIO(csv_content))
    results = []
    for row in reader:
        if not row or row[0].startswith("#"):
            continue
        fingerprint = row[0].strip()
        credits = int(row[1].strip()) if len(row) > 1 else count
        device = db.get_device_license(fingerprint)
        if device:
            db.add_scans(fingerprint, credits)
            results.append({"fingerprint": fingerprint, "added": credits, "status": "ok"})
        else:
            results.append({"fingerprint": fingerprint, "added": 0, "status": "device_not_found"})
    return {
        "processed": len(results),
        "success": sum(1 for r in results if r["status"] == "ok"),
        "failed": sum(1 for r in results if r["status"] != "ok"),
        "details": results,
    }

@router.post("/api/dashboard/bulk-license/org/{org_id}")
async def bulk_add_scans_org(org_id: str, request: Request, _admin=Depends(require_super_admin)):
    data = await request.json()
    count = data.get("count", 2)
    devices = db.get_all_devices(org_id)
    updated = 0
    for device in devices:
        db.add_scans(device["fingerprint"], count)
        updated += 1
    return {"org_id": org_id, "devices_updated": updated, "credits_each": count}


# ── Lab Utilization ──

@router.get("/api/dashboard/lab-utilization")
async def get_lab_utilization(days: int = 30, org_id: Optional[str] = None, _admin=Depends(require_admin)):
    """Estimate lab utilization from device heartbeat/scan activity."""
    scoped_org = resolve_org_scope(_admin, org_id)
    devices = db.get_all_devices(scoped_org)
    
    now = datetime.datetime.now(datetime.timezone.utc)
    high = medium = low = idle = 0
    total_util = 0
    items = []
    
    for d in devices:
        last_seen = d.get('last_seen', '')
        scans = d.get('total_scans', 0) or 0
        
        # Calculate days since last seen
        days_ago = days  # default to full period if unknown
        if last_seen:
            try:
                ls = datetime.datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                if ls.tzinfo is None:
                    ls = ls.replace(tzinfo=datetime.timezone.utc)
                days_ago = (now - ls).days
            except: pass
        
        # Estimate utilization: recent activity = high use
        if days_ago <= 1:
            util_pct = min(90, 60 + scans * 5)
            cat = 'high'; high += 1
        elif days_ago <= 7:
            util_pct = min(60, 30 + scans * 3)
            cat = 'medium'; medium += 1
        elif days_ago <= 30:
            util_pct = min(20, 5 + scans)
            cat = 'low'; low += 1
        else:
            util_pct = 0
            cat = 'idle'; idle += 1
        
        total_util += util_pct
        items.append({
            'hostname': d.get('hostname', 'Unknown'),
            'org_name': d.get('org_name', d.get('org_id', 'N/A')),
            'utilization_pct': util_pct,
            'category': cat,
            'heartbeats': scans,
            'last_seen': last_seen or 'Never',
        })
    
    total = len(devices)
    avg = round(total_util / max(total, 1))
    
    if idle > total * 0.3:
        rec = f"{idle} devices appear idle. Consider reallocating or decommissioning unused assets."
    elif avg < 30:
        rec = "Overall utilization is low. Review device allocation across labs."
    else:
        rec = "Utilization is within acceptable range. Continue monitoring."
    
    return {
        "categories": {"high": high, "medium": medium, "low": low, "idle": idle},
        "avg_utilization_pct": avg,
        "period_days": days,
        "total_devices": total,
        "recommendation": rec,
        "devices": sorted(items, key=lambda x: x['utilization_pct'], reverse=True),
    }


# ── E-Waste & AMC Compliance ──

@router.get("/api/dashboard/ewaste-report")
async def get_ewaste_report(org_id: Optional[str] = None, _admin=Depends(require_admin)):
    """Generate e-waste compliance report from device health data."""
    scoped_org = resolve_org_scope(_admin, org_id)
    devices = db.get_all_devices(scoped_org)
    fps = [d['fingerprint'] for d in devices]
    scans = db.get_latest_scans_batch(fps) if fps else {}
    
    keep = review = ewaste = 0
    items = []
    for d in devices:
        scan = scans.get(d['fingerprint'], {})
        grade = scan.get('overall_grade', '?')
        sd = scan.get('scan_data', {})
        hd = scan.get('health_data', {})
        if isinstance(sd, str):
            try: sd = json.loads(sd)
            except: sd = {}
        if isinstance(hd, str):
            try: hd = json.loads(hd)
            except: hd = {}
        
        os_info = sd.get('os', {})
        age_days = os_info.get('install_age_days', 0)
        age_years = round(age_days / 365, 1) if age_days else 0
        cpu_name = sd.get('cpu', {}).get('brand', 'N/A')
        ram_gb = sd.get('ram', {}).get('total_gb', 0)
        
        if grade in ('A', 'B'):
            flag = 'keep'; keep += 1; reason = 'Good condition'
        elif grade == 'C':
            flag = 'review'; review += 1; reason = 'Aging - review for replacement'
        else:
            flag = 'dispose'; ewaste += 1
            top_issues = hd.get('overall', {}).get('top_issues', []) if isinstance(hd, dict) else []
            reason = top_issues[0] if top_issues else 'Multiple components degraded'
        
        items.append({
            'hostname': d.get('hostname', 'Unknown'),
            'fingerprint': d['fingerprint'],
            'org_name': d.get('org_name', d.get('org_id', 'N/A')),
            'overall_grade': grade,
            'disposal_flag': flag,
            'bios_age_years': age_years,
            'cpu': cpu_name,
            'ram_gb': round(ram_gb, 1) if ram_gb else 0,
            'reason': reason,
        })
    
    return {
        "keep": keep, "review": review, "e_waste": ewaste, "total": len(devices),
        "compliance_note": f"E-waste assessment based on MoEFCC guidelines. {ewaste} devices flagged for disposal, {review} under review.",
        "items": items
    }


@router.get("/api/dashboard/amc")
async def get_amc_data(org_id: Optional[str] = None, _admin=Depends(require_admin)):
    """Generate AMC/warranty tracker data from device scan data."""
    scoped_org = resolve_org_scope(_admin, org_id)
    devices = db.get_all_devices(scoped_org)
    fps = [d['fingerprint'] for d in devices]
    scans = db.get_latest_scans_batch(fps) if fps else {}
    
    records = []
    expired = expiring_soon = active = 0
    for d in devices:
        scan = scans.get(d['fingerprint'], {})
        sd = scan.get('scan_data', {})
        if isinstance(sd, str):
            try: sd = json.loads(sd)
            except: sd = {}
        
        install_age = sd.get('os', {}).get('install_age_days', 0)
        if install_age < 365:
            status = 'active'; days_left = 365 - install_age; active += 1
        elif install_age < 730:
            status = 'expiring_soon'; days_left = 730 - install_age; expiring_soon += 1
        else:
            status = 'expired'; days_left = 0; expired += 1
        
        vendor = sd.get('cpu', {}).get('brand', 'N/A')
        vendor = vendor.split('(')[0].strip()[:20] if vendor else 'N/A'
        
        records.append({
            'hostname': d.get('hostname', 'Unknown'),
            'fingerprint': d['fingerprint'][:16],
            'vendor_name': vendor,
            'contract_type': 'warranty',
            'end_date': 'Est. based on OS age',
            'days_remaining': days_left,
            'cost_inr': None,
            'status': status,
        })
    
    return {
        "expired": expired, "expiring_soon": expiring_soon, "active": active,
        "total": len(devices), "records": records
    }


@router.get("/api/dashboard/device/{fingerprint}/vitals")
async def get_device_vitals(fingerprint: str, _admin=Depends(require_admin)):
    """Get the last 24h of vitals for charting."""
    device = db.get_device_license(fingerprint)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    role = _admin.get("role", "")
    if role in ("org_user", "end_customer") and device.get("org_id") != _admin.get("org_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    vitals = db.get_device_vitals(fingerprint, limit=48)
    return {"vitals": vitals}

@router.get("/api/dashboard/device/{fingerprint}/vitals/latest")
async def get_latest_vitals(fingerprint: str, _admin=Depends(require_admin)):
    """Get the most recent vitals snapshot."""
    device = db.get_device_license(fingerprint)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    role = _admin.get("role", "")
    if role in ("org_user", "end_customer") and device.get("org_id") != _admin.get("org_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    vitals = db.get_latest_vitals(fingerprint)
    return {"latest_vitals": vitals}

# NOTE: Duplicate route removed — device health is handled by device_health_detail above

# ── Multi-Org Summary (Cross-Organization View) ──

@router.get("/api/dashboard/multi-org/summary")
async def multi_org_summary(_admin=Depends(require_admin)):
    """Get cross-organization summary with device counts, health scores, and grade distributions."""
    role = _admin.get("role", "")
    
    # Get orgs based on role scope
    if role == "partner":
        partner_id = _admin.get("partner_id")
        if partner_id:
            orgs = db.get_orgs_by_partner(partner_id)
        else:
            orgs = []
    elif role in ("org_user", "end_customer"):
        org_id = _admin.get("org_id")
        if org_id:
            all_orgs = db.get_all_orgs()
            orgs = [o for o in all_orgs if o.get("id") == org_id]
        else:
            orgs = []
    else:
        orgs = db.get_all_orgs()
    
    total_devices = 0
    total_online = 0
    org_summaries = []
    
    for org in orgs:
        org_id = org.get("id", "")
        org_name = org.get("name", org_id)
        
        devices = db.get_all_devices(org_id)
        device_count = len(devices)
        online_count = sum(1 for d in devices if d.get("online"))
        offline_count = device_count - online_count
        
        total_devices += device_count
        total_online += online_count
        
        # Aggregate scan credits
        scans_used = sum(d.get("scans_used", 0) for d in devices)
        total_scans = sum(d.get("total_scans", 0) for d in devices)
        scans_remaining = total_scans - scans_used
        
        # Get health score and grade distribution from latest scans
        fps = [d["fingerprint"] for d in devices]
        scans_batch = db.get_latest_scans_batch(fps) if fps else {}
        
        grades = {}
        scores = []
        for fp, scan in scans_batch.items():
            grade = scan.get("overall_grade", "?")
            grades[grade] = grades.get(grade, 0) + 1
            score = scan.get("overall_score", 0)
            if score:
                scores.append(score)
        
        avg_health = round(sum(scores) / len(scores)) if scores else 0
        
        org_summaries.append({
            "org_id": org_id,
            "org_name": org_name,
            "device_count": device_count,
            "online_count": online_count,
            "offline_count": offline_count,
            "health_score": avg_health,
            "grade_distribution": grades,
            "scans_used": scans_used,
            "total_scans": total_scans,
            "scans_remaining": scans_remaining,
        })
    
    return {
        "total_organizations": len(orgs),
        "total_devices": total_devices,
        "total_online": total_online,
        "organizations": org_summaries,
    }


@router.get("/api/dashboard/multi-org/{org_id}/detail")
async def multi_org_detail(org_id: str, _admin=Depends(require_admin)):
    """Get detailed device list for a specific organization."""
    scoped_org = resolve_org_scope(_admin, org_id)
    devices = db.get_all_devices(scoped_org)
    
    fps = [d["fingerprint"] for d in devices]
    scans_batch = db.get_latest_scans_batch(fps) if fps else {}
    
    device_details = []
    for d in devices:
        scan = scans_batch.get(d["fingerprint"], {})
        device_details.append({
            "hostname": d.get("hostname", "Unknown"),
            "fingerprint": d["fingerprint"],
            "online": d.get("online", False),
            "overall_grade": scan.get("overall_grade", "?"),
            "overall_score": scan.get("overall_score", 0),
            "scans_remaining": d.get("scans_remaining", 0),
            "last_seen": d.get("last_seen", "Never"),
        })
    
    return {
        "org_id": org_id,
        "devices": device_details,
        "total": len(device_details),
    }

@router.get("/api/dashboard/software-audit")
async def software_audit(org_id: Optional[str] = None, _admin=Depends(require_admin)):
    """Generate a software inventory audit across all scoped devices."""
    scoped_org = resolve_org_scope(_admin, org_id)
    devices = db.get_all_devices(scoped_org)
    fps = [d["fingerprint"] for d in devices]
    
    scans = db.get_latest_scans_batch(fps) if fps else {}
    
    software_map = {} # name -> { count: int, versions: set }
    total_scanned = 0
    
    for fp, scan in scans.items():
        scan_data = scan.get("scan_data", {})
        if not scan_data:
            continue
        
        total_scanned += 1
        
        # In a real scenario, this extracts from scan_data.get("software", [])
        # Currently, if data is missing, it will just leave software_map empty.
        software_list = scan_data.get("software", [])
        for sw in software_list:
            name = sw.get("name", "Unknown")
            version = sw.get("version", "Unknown")
            
            if name not in software_map:
                software_map[name] = {"count": 0, "versions": set()}
            
            software_map[name]["count"] += 1
            if version and version != "Unknown":
                software_map[name]["versions"].add(version)
                
    inventory = []
    for name, data in software_map.items():
        inventory.append({
            "name": name,
            "count": data["count"],
            "versions": list(data["versions"])
        })
        
    inventory.sort(key=lambda x: x["count"], reverse=True)

    return {
        "unique_software": len(inventory),
        "total_devices_scanned": total_scanned,
        "software_inventory": inventory
    }

