import sys
from unittest.mock import MagicMock, patch

# Mock database modules before any other import to prevent network/connection attempts on module load
mock_pymysql = MagicMock()
mock_pymysql.cursors = MagicMock()
sys.modules["pymysql"] = mock_pymysql
sys.modules["pymysql.cursors"] = mock_pymysql.cursors

mock_dbutils = MagicMock()
sys.modules["dbutils"] = mock_dbutils
sys.modules["dbutils.pooled_db"] = mock_dbutils

import unittest
import os
import datetime

# Ensure telemetry_server is in the Python search path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Set dummy environment variables to satisfy config.py load
os.environ["MYSQL_HOST"] = "localhost"
os.environ["MYSQL_USER"] = "root"
os.environ["MYSQL_PASSWORD"] = "pass"
os.environ["MYSQL_DATABASE"] = "test"
os.environ["AGENT_API_KEY"] = "bostontech-agent-secret"

from fastapi.testclient import TestClient
from main import app
import database as db
from database import _compute_online_status, _utcnow_iso

class TestCatalystScanSuite(unittest.TestCase):
    def setUp(self):
        """Set up standard mocks and test client before each test."""
        app.dependency_overrides.clear()
        self.client = TestClient(app)
        self.patchers = []
        
        # List of database methods to mock out during the API test runs
        db_funcs = [
            "authenticate_user", "get_user_by_username", "get_fleet_stats",
            "get_device_license", "consume_scan", "register_device",
            "save_scan_result", "save_system_audit", "save_heartbeat",
            "save_tamper_alert", "check_feature_flag", "log_audit_event",
            "add_scans"
        ]
        
        self.mocks = {}
        for func_name in db_funcs:
            p = patch(f"database.{func_name}")
            mock_func = p.start()
            self.patchers.append(p)
            self.mocks[func_name] = mock_func
            
        # Wire default mock behaviors
        self.mocks["authenticate_user"].side_effect = lambda u, p: {
            "username": u, "display_name": "Test User", "role": "super_admin", "partner_id": None, "org_id": None
        } if u == "admin" and p == "correct_pass" else None
        
        self.mocks["get_user_by_username"].side_effect = lambda u: {
            "username": u, "display_name": "Test User", "role": "super_admin"
        } if u == "admin" else None
        
        self.mocks["get_fleet_stats"].side_effect = lambda org: {
            "total_devices": 10, "online": 5, "offline": 5,
            "active_alerts": 2, "needs_upgrade": 1
        }
        
        self.mocks["get_device_license"].side_effect = lambda fp: {
            "fingerprint": fp, "total_scans": 10, "scans_used": 3, "scans_remaining": 7, "org_id": "test_org"
        } if fp == "valid_fp" else None
        
        self.mocks["consume_scan"].side_effect = lambda fp: True if fp == "valid_fp" else False
        self.mocks["register_device"].side_effect = lambda **k: {"fingerprint": k.get("fingerprint"), "success": True}
        self.mocks["check_feature_flag"].side_effect = lambda o, f: {"enabled": True, "feature": f}

    def tearDown(self):
        """Restore all patches after each test."""
        app.dependency_overrides.clear()
        for p in self.patchers:
            p.stop()

    # ── Auth & Registration Tests ──

    def test_login_success(self):
        """Test authentication succeeds with valid credentials."""
        response = self.client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "correct_pass"},
            headers={"Origin": "http://localhost:9000"}
        )
        self.assertEqual(response.status_code, 200)
        json_data = response.json()
        self.assertTrue(json_data["success"])
        self.assertIn("token", json_data)
        self.assertEqual(json_data["username"], "Test User")

    def test_login_failure(self):
        """Test authentication returns 401 on incorrect password."""
        response = self.client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "wrong_pass"},
            headers={"Origin": "http://localhost:9000"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid username or password")

    def test_check_session_without_auth(self):
        """Test session validation fails for non-authenticated clients."""
        response = self.client.get("/api/auth/session")
        self.assertEqual(response.status_code, 401)

    def test_get_license_valid(self):
        """Test license remaining counts lookup for a valid fingerprint."""
        response = self.client.get(
            "/api/license/valid_fp",
            headers={"X-Agent-Key": "bostontech-agent-secret"}
        )
        self.assertEqual(response.status_code, 200)
        json_data = response.json()
        self.assertEqual(json_data["fingerprint"], "valid_fp")
        self.assertEqual(json_data["scans_remaining"], 7)

    def test_get_license_invalid(self):
        """Test license stats lookup for an invalid fingerprint returns 404."""
        response = self.client.get(
            "/api/license/non_existent_fp",
            headers={"X-Agent-Key": "bostontech-agent-secret"}
        )
        self.assertEqual(response.status_code, 404)

    # ── Telemetry & Feature Check Tests ──

    def test_receive_telemetry(self):
        """Test telemetry uploads with valid agent API key."""
        payload = {
            "type": "scan_telemetry",
            "fingerprint": "valid_fp",
            "scan_data": {
                "hostname": "Test-PC",
                "cpu": "Intel Core i7",
                "ram_gb": 16,
                "os_version": "Windows 11",
                "_audits": []
            },
            "health_data": {
                "overall_grade": "A",
                "cpu_score": 95,
                "ram_score": 90,
                "disk_score": 85,
                "gpu_score": 100
            },
            "compatibility_data": []
        }
        response = self.client.post(
            "/api/telemetry",
            json=payload,
            headers={"X-Agent-Key": "bostontech-agent-secret"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "received")

    def test_receive_heartbeat(self):
        """Test telemetry heartbeat ingestion."""
        payload = {
            "fingerprint": "valid_fp",
            "org_name": "Test Org"
        }
        response = self.client.post(
            "/api/telemetry/heartbeat",
            json=payload,
            headers={"X-Agent-Key": "bostontech-agent-secret"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "alive")

    def test_receive_tamper_alert(self):
        """Test registering tamper hardware change alerts."""
        payload = {
            "fingerprint": "valid_fp",
            "org_name": "Test Org",
            "tamper_data": {
                "component": "RAM",
                "original": "8GB Kingston",
                "current": "4GB Crucial"
            }
        }
        response = self.client.post(
            "/api/alert/tamper",
            json=payload,
            headers={"X-Agent-Key": "bostontech-agent-secret"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "alert_received")

    def test_check_feature_flag(self):
        """Test device checking a enabled feature flag."""
        response = self.client.get(
            "/api/feature-check/network-scan/valid_fp",
            headers={"X-Agent-Key": "bostontech-agent-secret"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["enabled"], True)

    # ── Dashboard Statistics & Guarding Tests ──

    def test_dashboard_stats_requires_admin(self):
        """Test dashboard stats returns 401 for unauthorized visitors."""
        response = self.client.get("/api/dashboard/stats")
        self.assertEqual(response.status_code, 401)

    def test_dashboard_stats_success(self):
        """Test dashboard stats successfully retrieves aggregate info for admin."""
        from middleware import require_admin
        app.dependency_overrides[require_admin] = lambda: {
            "username": "admin", "role": "super_admin", "partner_id": None, "org_id": None
        }
        response = self.client.get("/api/dashboard/stats")
        self.assertEqual(response.status_code, 200)
        json_data = response.json()
        self.assertEqual(json_data["total_devices"], 10)
        self.assertEqual(json_data["online"], 5)

    def test_dashboard_stats_empty_db(self):
        """Test empty database returns structured zero stats without 500 error."""
        self.mocks["get_fleet_stats"].side_effect = lambda org: None
        from middleware import require_admin
        app.dependency_overrides[require_admin] = lambda: {
            "username": "admin", "role": "super_admin", "partner_id": None, "org_id": None
        }
        response = self.client.get("/api/dashboard/stats")
        self.assertEqual(response.status_code, 200)
        json_data = response.json()
        self.assertEqual(json_data["total_devices"], 0)
        self.assertEqual(json_data["online"], 0)

    # ── Database Helpers/Utility Tests ──

    def test_utcnow_iso_format(self):
        """Test that _utcnow_iso returns standard Z-suffixed ISO timestamp."""
        ts = _utcnow_iso()
        self.assertIsInstance(ts, str)
        self.assertTrue(ts.endswith("Z"))
        parsed = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
        self.assertIsNotNone(parsed)

    def test_compute_online_status_recent(self):
        """Test that a device reporting recently is online."""
        now = datetime.datetime.now(datetime.timezone.utc)
        recent_ts = now.isoformat().replace("+00:00", "Z")
        self.assertTrue(_compute_online_status(recent_ts))

    def test_compute_online_status_old(self):
        """Test that an old timestamp correctly results in offline status."""
        old_ts = "2020-01-01T12:00:00Z"
        self.assertFalse(_compute_online_status(old_ts))

    def test_compute_online_status_invalid(self):
        """Test that invalid values fail gracefully without breaking."""
        self.assertFalse(_compute_online_status(None))
        self.assertFalse(_compute_online_status("not-a-valid-iso-date"))
        self.assertFalse(_compute_online_status(""))

if __name__ == "__main__":
    unittest.main()
