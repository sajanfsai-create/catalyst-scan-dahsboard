"""
CatalystScan — Export Router
CSV export endpoints for device lists, fleet health, and scan results.
Uses Python's built-in csv module — no external dependencies.
"""
import csv
import io
import logging
from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

import database as db
from middleware import require_admin, resolve_org_scope

logger = logging.getLogger(__name__)

router = APIRouter(tags=["export"])


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    """Build a streaming CSV response from a list of dicts."""
    if not rows:
        output = io.StringIO()
        output.write("No data available\n")
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    for row in rows:
        # Sanitize values: convert non-string types and strip potential formula injection
        safe_row = {}
        for k, v in row.items():
            val = str(v) if v is not None else ""
            # Prevent CSV injection: prefix cells starting with =, +, -, @ with a single quote
            if val and val[0] in ("=", "+", "-", "@"):
                val = "'" + val
            safe_row[k] = val
        writer.writerow(safe_row)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/api/dashboard/export/devices/csv")
async def export_devices_csv(org_id: Optional[str] = None, user=Depends(require_admin)):
    """Export device list to CSV, respecting org scope."""
    scope = resolve_org_scope(user, org_id)
    devices = db.get_all_devices(scope)

    # Flatten to export-friendly columns (exclude large JSON blobs)
    export_rows = []
    for d in devices:
        export_rows.append({
            "fingerprint": d.get("fingerprint", ""),
            "hostname": d.get("hostname", ""),
            "org_id": d.get("org_id", ""),
            "org_name": d.get("org_name", ""),
            "registered_at": d.get("registered_at", ""),
            "last_seen": d.get("last_seen", ""),
            "online": "Yes" if d.get("online") else "No",
            "total_scans": d.get("total_scans", 0),
            "scans_used": d.get("scans_used", 0),
            "scans_remaining": d.get("scans_remaining", 0),
            "is_active": "Yes" if d.get("is_active") else "No",
        })

    return _csv_response(export_rows, "catalystscan_devices.csv")


@router.get("/api/dashboard/export/fleet-health/csv")
async def export_fleet_health_csv(org_id: Optional[str] = None, user=Depends(require_admin)):
    """Export fleet health summary to CSV."""
    scope = resolve_org_scope(user, org_id)
    summary = db.get_fleet_health_summary(scope)

    if not summary:
        return _csv_response([], "catalystscan_fleet_health.csv")

    # The summary is typically a single aggregate; convert to rows
    devices_health = summary.get("devices", [])
    export_rows = []
    for d in devices_health:
        export_rows.append({
            "fingerprint": d.get("fingerprint", ""),
            "hostname": d.get("hostname", ""),
            "org_name": d.get("org_name", ""),
            "overall_score": d.get("overall_score", 0),
            "overall_grade": d.get("overall_grade", "?"),
            "last_seen": d.get("last_seen", ""),
        })

    if not export_rows:
        # Fallback: export the aggregate stats
        grade_dist = summary.get("grade_distribution", {})
        export_rows = [{"metric": k, "value": v} for k, v in grade_dist.items()]

    return _csv_response(export_rows, "catalystscan_fleet_health.csv")


@router.get("/api/dashboard/export/scan-results/csv")
async def export_scan_results_csv(fingerprint: str, user=Depends(require_admin)):
    """Export scan history for a specific device to CSV."""
    scans = db.get_scan_history(fingerprint, limit=50)

    export_rows = []
    for s in scans:
        export_rows.append({
            "scan_id": s.get("id", ""),
            "timestamp": s.get("timestamp", ""),
            "overall_score": s.get("overall_score", 0),
            "overall_grade": s.get("overall_grade", "?"),
        })

    return _csv_response(export_rows, f"catalystscan_scans_{fingerprint[:8]}.csv")


@router.get("/api/dashboard/export/asset-register/csv")
async def export_asset_register_csv(org_id: Optional[str] = None, user=Depends(require_admin)):
    """Export asset register (AICTE/UGC compliant) to CSV."""
    scope = resolve_org_scope(user, org_id)
    devices = db.get_all_devices(scope)
    fps = [d["fingerprint"] for d in devices]
    scans = db.get_latest_scans_batch(fps) if fps else {}

    export_rows = []
    for d in devices:
        fp = d["fingerprint"]
        scan = scans.get(fp, {})
        scan_data = scan.get("scan_data", {})
        
        # Hardware specs might be nested under 'system' or 'hardware' or top-level. 
        # Attempting to pull generic known keys.
        os_info = scan_data.get("os", "Unknown")
        cpu_info = scan_data.get("cpu", "Unknown")
        ram_info = scan_data.get("ram_gb", "Unknown")
        if ram_info != "Unknown":
            ram_info = f"{ram_info} GB"
        
        ip_addr = scan_data.get("ip_address", scan_data.get("ip", "Unknown"))
        mac_addr = scan_data.get("mac_address", scan_data.get("mac", "Unknown"))
        
        # Often disks are an array or single value
        primary_disk = "Unknown"
        disks = scan_data.get("disks", [])
        if disks and isinstance(disks, list):
            primary_disk = disks[0].get("model", "Unknown") if isinstance(disks[0], dict) else str(disks[0])
            
        export_rows.append({
            "Hostname": d.get("hostname", "Unknown"),
            "IP Address": ip_addr,
            "MAC Address": mac_addr,
            "OS": os_info,
            "CPU": cpu_info,
            "RAM": ram_info,
            "Primary Disk": primary_disk,
            "Last Seen": d.get("last_seen", "Unknown"),
        })

    return _csv_response(export_rows, "AICTE_UGC_Asset_Register.csv")


@router.get("/api/dashboard/export/component-parts/csv")
async def export_component_parts_csv(org_id: Optional[str] = None, user=Depends(require_admin)):
    """Export hardware component part codes (Motherboard, CPU, Storage, RAM, MAC) to CSV."""
    scope = resolve_org_scope(user, org_id)
    devices = db.get_all_devices(scope)
    fps = [d["fingerprint"] for d in devices]
    scans = db.get_latest_scans_batch(fps) if fps else {}

    export_rows = []
    for d in devices:
        fp = d["fingerprint"]
        scan = scans.get(fp, {})
        scan_data = scan.get("scan_data", {})
        
        # Motherboard Serial
        mb_serial = scan_data.get("motherboard", {}).get("serial_number", "Unknown")
        
        # CPU Processor ID
        cpu_id = scan_data.get("cpu", {}).get("processor_id", "Unknown")
        
        # Storage Serial Numbers
        storage_serials = []
        drives = scan_data.get("storage", {}).get("drives", [])
        if drives and isinstance(drives, list):
            for drive in drives:
                if isinstance(drive, dict) and drive.get("serial_number") and drive.get("serial_number") != "Not Available":
                    storage_serials.append(drive.get("serial_number"))
        storage_serial_str = " | ".join(storage_serials) if storage_serials else "Unknown"
        
        # RAM Part / Serial Numbers
        ram_serials = []
        ram_parts = []
        modules = scan_data.get("ram", {}).get("modules", [])
        if modules and isinstance(modules, list):
            for mod in modules:
                if isinstance(mod, dict):
                    sn = mod.get("serial_number")
                    pn = mod.get("part_number")
                    if sn and sn != "Not Available":
                        ram_serials.append(sn)
                    if pn and pn != "Not Available":
                        ram_parts.append(pn)
        ram_serial_str = " | ".join(ram_serials) if ram_serials else "Unknown"
        ram_part_str = " | ".join(ram_parts) if ram_parts else "Unknown"
        
        # MAC Addresses
        mac_addresses = []
        networks = scan_data.get("network", [])
        if networks and isinstance(networks, list):
            for net in networks:
                if isinstance(net, dict) and net.get("mac_address"):
                    mac_addresses.append(net.get("mac_address"))
        mac_str = " | ".join(mac_addresses) if mac_addresses else "Unknown"

        export_rows.append({
            "Hostname": d.get("hostname", "Unknown"),
            "Organization": d.get("org_name", "Unknown"),
            "Motherboard Serial": mb_serial,
            "CPU Processor ID": cpu_id,
            "Storage Serial Numbers": storage_serial_str,
            "RAM Part Numbers": ram_part_str,
            "RAM Serial Numbers": ram_serial_str,
            "MAC Addresses": mac_str,
            "Last Seen": d.get("last_seen", "Unknown"),
        })

    return _csv_response(export_rows, "Component_Part_Codes.csv")

