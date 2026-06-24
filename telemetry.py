"""
CatalystScan — Telemetry Client
Sends heartbeat pings and scan payloads to the Central Dashboard server.
"""

import json
import datetime
import threading
import time

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


class TelemetryClient:
    """Sends telemetry data to the central monitoring server."""

    def __init__(self, server_url, org_name="Unknown", org_id=None, fingerprint=None):
        self.server_url = server_url.rstrip("/")
        self.org_name = org_name
        self.org_id = org_id
        self.fingerprint = fingerprint
        self._heartbeat_thread = None
        self._running = False

    def send_scan_payload(self, scan_data, health_data=None, compatibility_data=None):
        """Send complete scan results to the central server."""
        if not HAS_REQUESTS:
            return {"error": "requests library not available"}

        payload = {
            "type": "scan_result",
            "fingerprint": self.fingerprint,
            "org_name": self.org_name,
            "org_id": self.org_id,
            "timestamp": datetime.datetime.now().isoformat(),
            "hostname": scan_data.get("os", {}).get("hostname", "Unknown"),
            "scan_data": scan_data,
            "health_data": health_data,
            "compatibility_data": compatibility_data,
        }

        try:
            resp = requests.post(
                f"{self.server_url}/api/telemetry",
                json=payload,
                timeout=15,
            )
            return {"status": resp.status_code, "success": resp.status_code == 200}
        except Exception as e:
            return {"error": str(e), "success": False}

    def send_tamper_alert(self, tamper_data):
        """Send a tamper/theft alert to the server."""
        if not HAS_REQUESTS:
            return {"error": "requests library not available"}

        payload = {
            "type": "tamper_alert",
            "fingerprint": self.fingerprint,
            "org_name": self.org_name,
            "org_id": self.org_id,
            "timestamp": datetime.datetime.now().isoformat(),
            "tamper_data": tamper_data,
        }

        try:
            resp = requests.post(
                f"{self.server_url}/api/alert/tamper",
                json=payload,
                timeout=15,
            )
            return {"status": resp.status_code, "success": resp.status_code == 200}
        except Exception as e:
            return {"error": str(e), "success": False}

    def send_heartbeat(self):
        """Send a lightweight heartbeat ping to indicate this system is online."""
        if not HAS_REQUESTS:
            return

        payload = {
            "type": "heartbeat",
            "fingerprint": self.fingerprint,
            "org_name": self.org_name,
            "org_id": self.org_id,
            "timestamp": datetime.datetime.now().isoformat(),
        }

        try:
            requests.post(
                f"{self.server_url}/api/telemetry/heartbeat",
                json=payload,
                timeout=5,
            )
        except Exception:
            pass  # Heartbeat failures are silent

    def start_heartbeat_loop(self, interval_seconds=300):
        """Start a background thread that sends heartbeats every N seconds."""
        if self._heartbeat_thread and self._heartbeat_thread.is_alive():
            return  # Already running

        self._running = True

        def _loop():
            while self._running:
                self.send_heartbeat()
                time.sleep(interval_seconds)

        self._heartbeat_thread = threading.Thread(target=_loop, daemon=True)
        self._heartbeat_thread.start()

    def stop_heartbeat_loop(self):
        """Stop the heartbeat background thread."""
        self._running = False
