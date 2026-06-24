"""
CatalystScan — Pydantic Request/Response Models
"""
from pydantic import BaseModel
from typing import Optional


class DeviceRegister(BaseModel):
    fingerprint: str
    hostname: str = "Unknown"
    org_id: Optional[str] = None
    org_name: Optional[str] = None
    registered_at: Optional[str] = None
    default_scan_limit: int = 2


class TelemetryPayload(BaseModel):
    type: str
    fingerprint: str
    org_name: Optional[str] = None
    org_id: Optional[str] = None
    timestamp: Optional[str] = None
    hostname: Optional[str] = None
    scan_data: Optional[dict] = None
    health_data: Optional[dict] = None
    compatibility_data: Optional[list] = None


class HeartbeatPayload(BaseModel):
    type: str = "heartbeat"
    fingerprint: str
    org_name: Optional[str] = None
    org_id: Optional[str] = None
    timestamp: Optional[str] = None
    vitals: Optional[dict] = None


class TamperAlertPayload(BaseModel):
    type: str = "tamper_alert"
    fingerprint: str
    org_name: Optional[str] = None
    org_id: Optional[str] = None
    timestamp: Optional[str] = None
    tamper_data: Optional[dict] = None


class AddScansRequest(BaseModel):
    fingerprint: str
    count: int = 2


class CreateOrgRequest(BaseModel):
    org_id: str
    name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    partner_id: Optional[int] = None
    org_category: Optional[str] = "Corporate"


class BuildExeRequest(BaseModel):
    org_name: str
    org_id: str
    telemetry_url: str = "https://catalystscan.bostontechindia.in"
    scan_limit: int = 2


class RenameOrgRequest(BaseModel):
    new_name: str
    new_contact_email: Optional[str] = None
    new_contact_phone: Optional[str] = None
    new_address: Optional[str] = None
