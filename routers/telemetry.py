"""
CatalystScan — Telemetry Router
Agent-facing endpoints for scan results, heartbeats, and tamper alerts.
"""
from fastapi import APIRouter, Depends
import database as db
from middleware import verify_agent_key
from models import TelemetryPayload, HeartbeatPayload, TamperAlertPayload

router = APIRouter(tags=["telemetry"])


@router.post("/api/telemetry")
async def receive_telemetry(payload: TelemetryPayload, _agent=Depends(verify_agent_key)):
    """Receive scan result telemetry from .exe clients."""
    db.save_scan_result(
        fingerprint=payload.fingerprint,
        scan_data=payload.scan_data,
        health_data=payload.health_data,
        compatibility_data=payload.compatibility_data,
    )
    
    if payload.scan_data and "_audits" in payload.scan_data:
        db.save_system_audit(payload.fingerprint, payload.scan_data["_audits"])
        
    return {"status": "received", "fingerprint": payload.fingerprint}


@router.post("/api/telemetry/heartbeat")
async def receive_heartbeat(payload: HeartbeatPayload, _agent=Depends(verify_agent_key)):
    """Receive heartbeat ping from .exe clients."""
    db.save_heartbeat(
        fingerprint=payload.fingerprint,
        org_name=payload.org_name,
        vitals=payload.vitals,
    )
    return {"status": "alive"}


@router.post("/api/alert/tamper")
async def receive_tamper_alert(payload: TamperAlertPayload, _agent=Depends(verify_agent_key)):
    """Receive tamper/theft alert from .exe clients."""
    db.save_tamper_alert(
        fingerprint=payload.fingerprint,
        org_name=payload.org_name or "Unknown",
        tamper_data=payload.tamper_data,
    )
    return {"status": "alert_received", "fingerprint": payload.fingerprint}


@router.get("/api/feature-check/{feature}/{fingerprint}")
async def check_feature(feature: str, fingerprint: str, _agent=Depends(verify_agent_key)):
    """Check if a feature is enabled for the device's organization."""
    device = db.get_device_license(fingerprint)
    if not device:
        return {"enabled": False, "reason": "Device not registered"}
    org_id = device.get("org_id", "")
    return db.check_feature_flag(org_id, feature)
