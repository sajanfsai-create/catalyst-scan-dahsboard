"""
CatalystScan — Centralized Configuration Module
All environment variables, secrets, and constants are loaded here.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ── Version ──
VERSION = "2.2"

# ── Database ──
MYSQL_HOST = os.environ.get("MYSQL_HOST", "mysql")
MYSQL_USER = os.environ.get("MYSQL_USER", "catalyst")
MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD", "CatalystSecureDBPass!")
MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE", "catalystscan")

# ── Security ──
SESSION_SECRET = os.environ.get("SESSION_SECRET")
if not SESSION_SECRET or SESSION_SECRET == "catalyst_secure_session_key_2026":
    raise RuntimeError("SESSION_SECRET must be set to a strong, unique value in .env")

AGENT_API_KEY = os.environ.get("AGENT_API_KEY")
if not AGENT_API_KEY:
    raise RuntimeError("AGENT_API_KEY must be set in .env")

# ── CORS ──
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:9000").split(",")]

# ── Server ──
SERVER_HOST = os.environ.get("SERVER_HOST", "0.0.0.0")
SERVER_PORT = int(os.environ.get("SERVER_PORT", "9000"))

# ── Paths ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DASHBOARD_DIR = os.path.join(BASE_DIR, "dashboard")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
BUILDS_DIR = os.path.join(BASE_DIR, "generated_builds")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")

# ── Timeouts & Thresholds (Issue #20: named constants) ──
DEVICE_ONLINE_THRESHOLD_SECONDS = 600       # 10 minutes — device considered "online" if seen within this window
TOKEN_TTL_SECONDS = 86400                    # 24 hours — session token lifetime
REMEMBER_ME_TTL_SECONDS = 2592000            # 30 days — "Remember Me" token lifetime
HEARTBEAT_INTERVAL_SECONDS = 300             # 5 minutes — agent heartbeat frequency
HEARTBEAT_MAX_PER_DAY = 288                  # Expected heartbeats per device per day
HEARTBEAT_RETENTION_DAYS = 90                # Prune heartbeats older than this
TELEMETRY_QUEUE_MAX_SIZE = 50                # Max queued payloads on client
AGENT_LOG_MAX_BYTES = 1_000_000              # 1 MB — rotate agent log at this size
SCAN_RETENTION_PER_DEVICE = 2                # DPDPA minimisation: keep N most recent scans

# ── Safe table map for DB Explorer ──
VALID_TABLE_MAP = {
    "devices": "devices",
    "organizations": "organizations",
    "scan_results": "scan_results",
    "heartbeats": "heartbeats",
    "tamper_alerts": "tamper_alerts",
    "partners": "partners",
    "users": "users",
    "build_registry": "build_registry",
    "credit_ledger": "credit_ledger",
    "system_audits": "system_audits",
    "audit_log": "audit_log",
}
