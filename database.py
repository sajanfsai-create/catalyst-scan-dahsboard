"""
Bostontech CatalystScan — Central Telemetry Dashboard Server
Database models and operations using MySQL (PyMySQL) with connection pooling.
"""

import pymysql
import pymysql.cursors
import os
import json
import datetime
import time
from typing import Optional

import bcrypt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

import logging

logger = logging.getLogger(__name__)

_ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)

from dotenv import load_dotenv
load_dotenv()

from config import (
    MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE,
    DEVICE_ONLINE_THRESHOLD_SECONDS, HEARTBEAT_RETENTION_DAYS,
    SCAN_RETENTION_PER_DEVICE,
)

if not all([MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE]):
    raise RuntimeError("MySQL credentials must be set in environment variables or .env file")

# ── UTC helper ──
_UTC = datetime.timezone.utc

def _utcnow_iso() -> str:
    """Return current UTC time as ISO string with Z suffix."""
    return datetime.datetime.now(_UTC).isoformat().replace("+00:00", "Z")

def _compute_online_status(last_seen) -> bool:
    """Determine if a device is online based on its last_seen timestamp.
    
    Centralised helper — replaces duplicated datetime parsing in
    get_device_license, get_all_devices, get_partner_stats, and multi_org_summary.
    """
    if not last_seen:
        return False
    try:
        last_str = last_seen.replace("Z", "+00:00") if isinstance(last_seen, str) else str(last_seen)
        last = datetime.datetime.fromisoformat(last_str.replace("Z", "+00:00") if last_str.endswith("Z") else last_str)
        now_utc = datetime.datetime.now(_UTC)
        # Normalise to naive for comparison if needed
        if last.tzinfo:
            last = last.replace(tzinfo=None)
        now_utc = now_utc.replace(tzinfo=None)
        return (now_utc - last).total_seconds() < DEVICE_ONLINE_THRESHOLD_SECONDS
    except (ValueError, TypeError):
        return False

# ── Connection Pool ──
try:
    from dbutils.pooled_db import PooledDB
    _pool = PooledDB(
        creator=pymysql,
        maxconnections=20,
        mincached=2,
        maxcached=10,
        blocking=True,
        host=MYSQL_HOST,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )
    _USE_POOL = True
except Exception as e:
    _pool = None
    _USE_POOL = False
    logger.warning(f"Database connection pool initialization failed ({e}) — falling back to per-request connections")

def get_db_connection():
    """Get a MySQL database connection from the pool (or create a fresh one as fallback)."""
    if _USE_POOL and _pool is not None:
        return _pool.connection()
    # Fallback: per-request connections with retry logic for Docker startup
    retries = 5
    last_error = None
    while retries > 0:
        try:
            return pymysql.connect(
                host=MYSQL_HOST,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                database=MYSQL_DATABASE,
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=True,
            )
        except pymysql.MySQLError as e:
            last_error = e
            retries -= 1
            if retries == 0:
                raise last_error
            time.sleep(2)
    raise RuntimeError("Failed to connect to MySQL after retries")

def init_db():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 1. Organizations Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS organizations (
                    id VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    contact_email VARCHAR(255),
                    contact_phone VARCHAR(255),
                    address TEXT
                )
            """)

            # 2. Devices Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS devices (
                    fingerprint VARCHAR(255) PRIMARY KEY,
                    hostname VARCHAR(255),
                    org_id VARCHAR(255),
                    org_name VARCHAR(255),
                    registered_at VARCHAR(255) NOT NULL,
                    last_seen VARCHAR(255),
                    total_scans INT DEFAULT 2,
                    scans_used INT DEFAULT 0,
                    is_active TINYINT DEFAULT 1,
                    baseline_data TEXT
                )
            """)

            # 3. Scan Results Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scan_results (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    fingerprint VARCHAR(255) NOT NULL,
                    timestamp VARCHAR(255) NOT NULL,
                    scan_data LONGTEXT,
                    health_data LONGTEXT,
                    compatibility_data LONGTEXT,
                    overall_score INT,
                    overall_grade VARCHAR(10),
                    FOREIGN KEY (fingerprint) REFERENCES devices(fingerprint) ON DELETE CASCADE
                )
            """)

            # 4. Heartbeats Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS heartbeats (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    fingerprint VARCHAR(255) NOT NULL,
                    timestamp VARCHAR(255) NOT NULL,
                    org_name VARCHAR(255),
                    FOREIGN KEY (fingerprint) REFERENCES devices(fingerprint) ON DELETE CASCADE
                )
            """)

            # 5. Tamper Alerts Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tamper_alerts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    fingerprint VARCHAR(255) NOT NULL,
                    timestamp VARCHAR(255) NOT NULL,
                    org_name VARCHAR(255),
                    tamper_data LONGTEXT,
                    resolved TINYINT DEFAULT 0,
                    FOREIGN KEY (fingerprint) REFERENCES devices(fingerprint) ON DELETE CASCADE
                )
            """)

            # 6. Feature Flags Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS feature_flags (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    org_id VARCHAR(255) NOT NULL,
                    feature_name VARCHAR(255) NOT NULL,
                    enabled TINYINT DEFAULT 1,
                    expires_at VARCHAR(255),
                    UNIQUE KEY unique_org_feature (org_id, feature_name)
                )
            """)

            # 7. AMC Records Table (Bug #7: moved from lazy creation in request handlers)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS amc_records (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    fingerprint VARCHAR(255) NOT NULL,
                    vendor_name VARCHAR(255),
                    contract_type VARCHAR(50),
                    start_date VARCHAR(50),
                    end_date VARCHAR(50),
                    cost_inr DECIMAL(10,2),
                    notes TEXT,
                    UNIQUE KEY unique_fp (fingerprint)
                )
            """)

            # 8. Alert Config Table (Bug #7: moved from lazy creation in request handlers)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alert_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    org_id VARCHAR(255) NOT NULL,
                    email_enabled TINYINT DEFAULT 0,
                    email_recipients TEXT,
                    webhook_enabled TINYINT DEFAULT 0,
                    webhook_url TEXT,
                    whatsapp_enabled TINYINT DEFAULT 0,
                    whatsapp_numbers TEXT,
                    alert_on_tamper TINYINT DEFAULT 1,
                    alert_on_offline TINYINT DEFAULT 0,
                    alert_on_grade_drop TINYINT DEFAULT 0,
                    alert_on_amc_expiry TINYINT DEFAULT 1,
                    UNIQUE KEY unique_org (org_id)
                )
            """)

            # 9. Partners Table — Channel partners / resellers
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS partners (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    contact_name VARCHAR(255),
                    contact_email VARCHAR(255),
                    contact_phone VARCHAR(255),
                    address TEXT,
                    is_active TINYINT DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 10. Users Table — All user accounts (replaces hardcoded ADMIN_USERS)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    display_name VARCHAR(255) NOT NULL,
                    role ENUM('super_admin', 'partner', 'org_user') NOT NULL,
                    partner_id INT DEFAULT NULL,
                    org_id VARCHAR(255) DEFAULT NULL,
                    is_active TINYINT DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME DEFAULT NULL
                )
            """)

            # 11. System Audits Table (Optimizer/Security stats)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS system_audits (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    fingerprint VARCHAR(255),
                    temp_waste_gb FLOAT,
                    startup_count INT,
                    security_score INT,
                    bloatware_count INT,
                    software_boost_pct INT,
                    hardware_boost_pct INT,
                    cleanup_performed TINYINT DEFAULT 0,
                    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (fingerprint) REFERENCES devices(fingerprint) ON DELETE CASCADE
                )
            """)
            # 12. Add partner_id to organizations (safe ALTER — ignores if column exists)
            try:
                cursor.execute("ALTER TABLE organizations ADD COLUMN partner_id INT DEFAULT NULL")
            except Exception:
                pass  # Column already exists

            # 12. Audit Log Table (DPDPA Section 8)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    user_id INT,
                    username VARCHAR(100),
                    action VARCHAR(100) NOT NULL,
                    target_type VARCHAR(50),
                    target_id VARCHAR(255),
                    details TEXT,
                    ip_address VARCHAR(45),
                    INDEX idx_timestamp (timestamp),
                    INDEX idx_action (action)
                )
            """)

            # 13. Site Settings Table (Grievance Officer, platform config)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS site_settings (
                    setting_key VARCHAR(100) PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    updated_by VARCHAR(100)
                )
            """)

            # 14. Credit Ledger Table (₹25/scan billing)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS credit_ledger (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    partner_id INT DEFAULT NULL,
                    org_id VARCHAR(255) DEFAULT NULL,
                    transaction_type ENUM('purchase','allocation','scan_debit','refund','adjustment') NOT NULL,
                    amount_inr DECIMAL(10,2) NOT NULL DEFAULT 0,
                    credits INT NOT NULL,
                    balance_after INT NOT NULL DEFAULT 0,
                    description TEXT,
                    created_by VARCHAR(100),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_partner (partner_id),
                    INDEX idx_org (org_id),
                    INDEX idx_created (created_at)
                )
            """)

            # 15. Add credit columns to partners (safe ALTER — ignores if exists)
            for col_sql in [
                "ALTER TABLE partners ADD COLUMN credit_balance INT DEFAULT 0",
                "ALTER TABLE partners ADD COLUMN total_credits_purchased INT DEFAULT 0",
                "ALTER TABLE partners ADD COLUMN total_spent_inr DECIMAL(10,2) DEFAULT 0",
            ]:
                try:
                    cursor.execute(col_sql)
                except Exception:
                    pass

            # 16. Add credit columns to organizations (safe ALTER)
            for col_sql in [
                "ALTER TABLE organizations ADD COLUMN credit_balance INT DEFAULT 0",
                "ALTER TABLE organizations ADD COLUMN total_credits_purchased INT DEFAULT 0",
            ]:
                try:
                    cursor.execute(col_sql)
                except Exception:
                    pass

            # 17. Add is_approved to users (safe ALTER)
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN is_approved TINYINT DEFAULT 1")
            except Exception:
                pass

            # 18. Add end_customer to role ENUM (safe ALTER)
            try:
                cursor.execute("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'partner', 'org_user', 'end_customer', 'education_hod', 'education_it_head', 'education_dean', 'education_vc') NOT NULL")
            except Exception:
                pass
            
            # 18b. Add org_category to organizations (safe ALTER)
            try:
                cursor.execute("ALTER TABLE organizations ADD COLUMN org_category VARCHAR(100) DEFAULT 'Corporate'")
            except Exception:
                pass

            # 19. Build Registry Table (tracks every .exe build with version + fingerprint)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS build_registry (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    build_id VARCHAR(64) UNIQUE NOT NULL,
                    build_version VARCHAR(20) NOT NULL,
                    org_id VARCHAR(255) NOT NULL,
                    org_name VARCHAR(255),
                    built_by VARCHAR(100),
                    scan_limit INT DEFAULT 2,
                    zip_filename VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_org (org_id),
                    INDEX idx_build_id (build_id)
                )
            """)

            # 20. Add resolved_at and resolved_by to tamper_alerts for alert resolution
            try:
                cursor.execute("ALTER TABLE tamper_alerts ADD COLUMN resolved_at VARCHAR(255) DEFAULT NULL")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE tamper_alerts ADD COLUMN resolved_by VARCHAR(100) DEFAULT NULL")
            except Exception:
                pass

            # 21. Expand credit_ledger transaction_type to include deployment_debit
            try:
                cursor.execute("""ALTER TABLE credit_ledger MODIFY COLUMN transaction_type 
                    ENUM('purchase','allocation','scan_debit','refund','adjustment','deployment_debit') NOT NULL""")
            except Exception:
                pass

            # 21. Device Vitals Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS device_vitals (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    fingerprint VARCHAR(255) NOT NULL,
                    timestamp VARCHAR(255) NOT NULL,
                    cpu_load_pct FLOAT,
                    cpu_temp_c FLOAT,
                    memory_used_pct FLOAT,
                    memory_available_gb FLOAT,
                    disk_health_json LONGTEXT,
                    os_issues_json LONGTEXT,
                    top_processes_json LONGTEXT,
                    INDEX idx_fp_ts (fingerprint, timestamp),
                    FOREIGN KEY (fingerprint) REFERENCES devices(fingerprint) ON DELETE CASCADE
                )
            """)

        logger.info("MySQL Database Schema verified successfully.")
    except Exception as e:
        logger.error(f"Error initializing MySQL DB: {e}")
    finally:
        conn.close()

# ── Site Settings Helpers ──

def get_site_setting(key, default=None):
    """Get a single site setting value."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT setting_value FROM site_settings WHERE setting_key = %s", (key,))
            row = cursor.fetchone()
            return row["setting_value"] if row else default
    except Exception:
        return default
    finally:
        conn.close()

def get_all_site_settings():
    """Get all site settings as a dict."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT setting_key, setting_value, updated_at, updated_by FROM site_settings")
            rows = cursor.fetchall()
            return {r["setting_key"]: r for r in rows}
    except Exception:
        return {}
    finally:
        conn.close()

def set_site_setting(key, value, updated_by=None):
    """Upsert a site setting."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO site_settings (setting_key, setting_value, updated_by)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)
            """, (key, value, updated_by))
            conn.commit()
            return True
    except Exception as e:
        logger.error(f"Error setting site_setting: {e}")
        return False
    finally:
        conn.close()

# ── Operations ──

def get_device_vitals(fingerprint: str, limit: int = 48) -> list:
    """Retrieve the latest N vitals records for charting."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT * FROM device_vitals 
                WHERE fingerprint = %s 
                ORDER BY id ASC LIMIT %s
            """, (fingerprint, limit))
            rows = cursor.fetchall()
            for r in rows:
                for col in ["disk_health_json", "os_issues_json", "top_processes_json"]:
                    if r.get(col):
                        try:
                            r[col.replace("_json", "")] = json.loads(r[col])
                        except Exception:
                            r[col.replace("_json", "")] = []
                        del r[col]
            return rows
    except Exception as e:
        print(f"Error fetching vitals: {e}")
        return []
    finally:
        conn.close()

def get_latest_vitals(fingerprint: str) -> Optional[dict]:
    """Retrieve the most recent vitals snapshot."""
    vitals = get_device_vitals(fingerprint, limit=1)
    return vitals[-1] if vitals else None

def save_device_vitals(fingerprint: str, timestamp: str, vitals: dict) -> None:
    """Save real-time vitals and prune to last 48 records per device (24h at 30m)."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO device_vitals (
                    fingerprint, timestamp, cpu_load_pct, cpu_temp_c,
                    memory_used_pct, memory_available_gb, disk_health_json,
                    os_issues_json, top_processes_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                fingerprint, timestamp,
                vitals.get("cpu_load_pct"), vitals.get("cpu_temp_c"),
                vitals.get("memory_used_pct"), vitals.get("memory_available_gb"),
                json.dumps(vitals.get("disk_health", [])),
                json.dumps(vitals.get("os_issues", [])),
                json.dumps(vitals.get("top_processes", []))
            ))
            
            # Auto-prune to keep only 48 rows per device
            cursor.execute("""
                DELETE FROM device_vitals 
                WHERE fingerprint = %s 
                AND id NOT IN (
                    SELECT id FROM (
                        SELECT id FROM device_vitals 
                        WHERE fingerprint = %s 
                        ORDER BY id DESC LIMIT 48
                    ) foo
                )
            """, (fingerprint, fingerprint))
    except Exception as e:
        print(f"Failed to save device vitals: {e}")
    finally:
        conn.close()

def save_heartbeat(fingerprint: str, org_name: Optional[str] = None, vitals: Optional[dict] = None) -> None:
    """Save a heartbeat ping, update last_seen, and optionally save vitals."""
    conn = get_db_connection()
    now = _utcnow_iso()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO heartbeats (fingerprint, timestamp, org_name) VALUES (%s, %s, %s)", 
                (fingerprint, now, org_name)
            )
            cursor.execute(
                "UPDATE devices SET last_seen = %s WHERE fingerprint = %s", 
                (now, fingerprint)
            )
            # Prune heartbeats older than retention period
            cutoff = (datetime.datetime.now(_UTC) - datetime.timedelta(days=HEARTBEAT_RETENTION_DAYS)).isoformat().replace("+00:00", "Z")
            cursor.execute(
                "DELETE FROM heartbeats WHERE timestamp < %s",
                (cutoff,)
            )
            
        # Optional vitals processing
        if vitals:
            save_device_vitals(fingerprint, now, vitals)
            
    except Exception as e:
        logger.error(f"Failed to save heartbeat: {e}")
    finally:
        conn.close()

def get_tamper_alerts_by_org(org_id, resolved=False):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """SELECT ta.* FROM tamper_alerts ta 
                   JOIN devices d ON ta.fingerprint = d.fingerprint 
                   WHERE d.org_id = %s AND ta.resolved = %s 
                   ORDER BY ta.timestamp DESC""",
                (org_id, 1 if resolved else 0)
            )
            return cursor.fetchall()
    finally:
        conn.close()

def register_device(fingerprint: str, hostname: str, org_id: Optional[str] = None, org_name: Optional[str] = None, default_scan_limit: int = 2) -> dict:
    """Register a device. If new, auto-deduct scan credits from the org's balance."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM devices WHERE fingerprint = %s", (fingerprint,))
            device = cursor.fetchone()
            
            now = _utcnow_iso()
            
            if device:
                cursor.execute(
                    "UPDATE devices SET last_seen = %s, hostname = %s WHERE fingerprint = %s",
                    (now, hostname, fingerprint)
                )
                device['scans_remaining'] = device['total_scans'] - device['scans_used']
                return device

            # ── New device: auto-deduct credits from org or partner balance ──
            effective_org = org_id or "bostontech-default"
            allocated_scans = 0
            
            # Check org credit balance and partner
            cursor.execute("SELECT credit_balance, partner_id FROM organizations WHERE id = %s", (effective_org,))
            org = cursor.fetchone()
            
            if org is not None:
                org_available = org.get("credit_balance", 0)
                partner_id = org.get("partner_id")
                
                org_deduction = min(default_scan_limit, org_available)
                allocated_scans += org_deduction
                
                partner_deduction = 0
                if allocated_scans < default_scan_limit and partner_id is not None:
                    remaining_needed = default_scan_limit - allocated_scans
                    cursor.execute("SELECT credit_balance FROM partners WHERE id = %s", (partner_id,))
                    partner = cursor.fetchone()
                    if partner:
                        partner_available = partner.get("credit_balance", 0)
                        partner_deduction = min(remaining_needed, partner_available)
                        allocated_scans += partner_deduction
                
                # Perform deductions
                if org_deduction > 0:
                    cursor.execute(
                        "UPDATE organizations SET credit_balance = credit_balance - %s WHERE id = %s AND credit_balance >= %s",
                        (org_deduction, effective_org, org_deduction)
                    )
                    if cursor.rowcount > 0:
                        cursor.execute("SELECT credit_balance FROM organizations WHERE id = %s", (effective_org,))
                        updated_org = cursor.fetchone()
                        new_balance = updated_org["credit_balance"] if updated_org else 0
                        cursor.execute(
                            """INSERT INTO credit_ledger 
                               (org_id, transaction_type, amount_inr, credits, balance_after, description, created_by)
                               VALUES (%s, 'deployment_debit', %s, %s, %s, %s, 'system')""",
                            (effective_org, -(org_deduction * COST_PER_SCAN_INR), -org_deduction,
                             new_balance, f"Auto-deducted on device registration {fingerprint[:16]}...")
                        )
                    else:
                        allocated_scans -= org_deduction # Rollback if race condition
                        org_deduction = 0
                        
                if partner_deduction > 0:
                    cursor.execute(
                        "UPDATE partners SET credit_balance = credit_balance - %s WHERE id = %s AND credit_balance >= %s",
                        (partner_deduction, partner_id, partner_deduction)
                    )
                    if cursor.rowcount > 0:
                        cursor.execute("SELECT credit_balance FROM partners WHERE id = %s", (partner_id,))
                        updated_partner = cursor.fetchone()
                        new_balance = updated_partner["credit_balance"] if updated_partner else 0
                        cursor.execute(
                            """INSERT INTO credit_ledger 
                               (partner_id, org_id, transaction_type, amount_inr, credits, balance_after, description, created_by)
                               VALUES (%s, %s, 'deployment_debit', %s, %s, %s, %s, 'system')""",
                            (partner_id, effective_org, -(partner_deduction * COST_PER_SCAN_INR), -partner_deduction,
                             new_balance, f"Partner auto-deducted on device registration {fingerprint[:16]}...")
                        )
                    else:
                        allocated_scans -= partner_deduction # Rollback if race condition
            else:
                # Org not in DB — fallback to default (for backward compat)
                allocated_scans = default_scan_limit

            cursor.execute(
                """INSERT INTO devices (fingerprint, hostname, org_id, org_name, registered_at, last_seen, total_scans)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (fingerprint, hostname, effective_org,
                 org_name or "Unknown", now, now, allocated_scans)
            )
            return {
                "fingerprint": fingerprint,
                "hostname": hostname,
                "total_scans": allocated_scans,
                "scans_used": 0,
                "scans_remaining": allocated_scans,
                "is_new": True,
            }
    finally:
        conn.close()


# ── Build Registry ──

def register_build(build_id, build_version, org_id, org_name, built_by, scan_limit, zip_filename):
    """Record a new .exe build in the registry."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO build_registry 
                   (build_id, build_version, org_id, org_name, built_by, scan_limit, zip_filename)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (build_id, build_version, org_id, org_name, built_by, scan_limit, zip_filename)
            )
            return {"success": True, "build_id": build_id, "build_version": build_version}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


def get_next_build_version(org_id):
    """Get the next auto-incrementing build version for an org (e.g. 'v1', 'v2')."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as cnt FROM build_registry WHERE org_id = %s", (org_id,))
            row = cursor.fetchone()
            return f"v{(row['cnt'] or 0) + 1}"
    finally:
        conn.close()


def get_build_history(org_id=None, partner_id=None, limit=50):
    """Get build history, optionally filtered by org or partner scope."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if partner_id:
                # Get all orgs for this partner, then filter builds
                cursor.execute("SELECT id FROM organizations WHERE partner_id = %s", (partner_id,))
                org_ids = [r["id"] for r in cursor.fetchall()]
                if not org_ids:
                    return []
                placeholders = ", ".join(["%s"] * len(org_ids))
                cursor.execute(
                    f"SELECT * FROM build_registry WHERE org_id IN ({placeholders}) ORDER BY created_at DESC LIMIT %s",
                    (*org_ids, limit)
                )
            elif org_id:
                cursor.execute("SELECT * FROM build_registry WHERE org_id = %s ORDER BY created_at DESC LIMIT %s", (org_id, limit))
            else:
                cursor.execute("SELECT * FROM build_registry ORDER BY created_at DESC LIMIT %s", (limit,))
            return cursor.fetchall()
    finally:
        conn.close()


def get_customer_summary(org_id):
    """Get a complete summary for an end-customer's org: devices, health, optimization."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Org info
            cursor.execute("SELECT name, credit_balance FROM organizations WHERE id = %s", (org_id,))
            org = cursor.fetchone()
            org_name = org["name"] if org else org_id
            credit_balance = org["credit_balance"] if org else 0

            # Device summary
            cursor.execute("SELECT * FROM devices WHERE org_id = %s ORDER BY last_seen DESC", (org_id,))
            devices = cursor.fetchall()
            
            total_devices = len(devices)
            online_count = sum(1 for d in devices if _compute_online_status(d.get("last_seen")))
            
            # Get latest scan for each device
            device_summaries = []
            scores = []
            for d in devices:
                cursor.execute(
                    "SELECT overall_score, overall_grade, timestamp FROM scan_results WHERE fingerprint = %s ORDER BY timestamp DESC LIMIT 1",
                    (d["fingerprint"],)
                )
                scan = cursor.fetchone()
                grade = scan["overall_grade"] if scan else "?"
                score = scan["overall_score"] if scan else 0
                if score:
                    scores.append(score)
                
                device_summaries.append({
                    "hostname": d["hostname"],
                    "fingerprint": d["fingerprint"],
                    "online": _compute_online_status(d.get("last_seen")),
                    "last_seen": d.get("last_seen"),
                    "grade": grade,
                    "score": score,
                    "scans_remaining": d["total_scans"] - d["scans_used"],
                })
            
            avg_score = round(sum(scores) / len(scores)) if scores else 0

            # Optimization summary from system_audits
            cursor.execute("""
                SELECT AVG(software_boost_pct) as avg_sw, AVG(hardware_boost_pct) as avg_hw,
                       SUM(CASE WHEN software_boost_pct > 10 OR hardware_boost_pct > 20 THEN 1 ELSE 0 END) as needs_attention
                FROM system_audits sa
                INNER JOIN devices d ON sa.fingerprint = d.fingerprint
                WHERE d.org_id = %s
            """, (org_id,))
            opt = cursor.fetchone()

            return {
                "org_name": org_name,
                "org_id": org_id,
                "total_devices": total_devices,
                "online_devices": online_count,
                "avg_health_score": avg_score,
                "credit_balance": credit_balance,
                "devices": device_summaries,
                "optimization": {
                    "software_gain_avg_pct": round(opt["avg_sw"] or 0) if opt else 0,
                    "hardware_gain_avg_pct": round(opt["avg_hw"] or 0) if opt else 0,
                    "devices_needing_attention": int(opt["needs_attention"] or 0) if opt else 0,
                }
            }
    finally:
        conn.close()

def delete_organization(org_id):
    """Deletes an organization by its ID."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM organizations WHERE id = %s", (org_id,))
            return True
    except Exception as e:
        logger.error(f"Error deleting organization: {e}")
        return False
    finally:
        conn.close()

def rename_organization(org_id, new_name, new_email=None, new_phone=None, new_address=None):
    """Updates all organization fields in a single database trip."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """UPDATE organizations 
                   SET name = %s, contact_email = %s, contact_phone = %s, address = %s 
                   WHERE id = %s""",
                (new_name, new_email, new_phone, new_address, org_id)
            )
            return True
    except Exception as e:
        logger.error(f"DB Error: {e}")
        return False
    finally:
        conn.close()

def get_device_license(fingerprint):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM devices WHERE fingerprint = %s", (fingerprint,))
            device = cursor.fetchone()
            if not device: 
                return None
            device["scans_remaining"] = device["total_scans"] - device["scans_used"]
            # Compute online status (same logic as get_all_devices)
            device["online"] = _compute_online_status(device.get("last_seen"))
            return device
    finally:
        conn.close()

def consume_scan(fingerprint: str) -> bool:
    """Consume one scan credit atomically. Auto-replenishes from Org or Partner balance if needed."""
    conn = get_db_connection()
    now = _utcnow_iso()
    try:
        with conn.cursor() as cursor:
            # 1. Try atomic consume if local scans available
            cursor.execute(
                """UPDATE devices SET scans_used = scans_used + 1, last_seen = %s 
                   WHERE fingerprint = %s AND scans_used < total_scans""",
                (now, fingerprint)
            )
            if cursor.rowcount > 0:
                return True
                
            # 2. If out of local scans, attempt auto-replenish from org/partner balances
            cursor.execute("SELECT org_id FROM devices WHERE fingerprint = %s", (fingerprint,))
            dev = cursor.fetchone()
            if not dev: return False
            
            org_id = dev["org_id"]
            cursor.execute("SELECT credit_balance, partner_id FROM organizations WHERE id = %s", (org_id,))
            org = cursor.fetchone()
            if not org: return False
            
            # Try org
            if org.get("credit_balance", 0) > 0:
                cursor.execute("UPDATE organizations SET credit_balance = credit_balance - 1 WHERE id = %s AND credit_balance > 0", (org_id,))
                if cursor.rowcount > 0:
                    cursor.execute("UPDATE devices SET total_scans = total_scans + 1, scans_used = scans_used + 1, last_seen = %s WHERE fingerprint = %s", (now, fingerprint))
                    
                    # Ledger entry
                    cursor.execute("SELECT credit_balance FROM organizations WHERE id = %s", (org_id,))
                    new_bal = cursor.fetchone()["credit_balance"]
                    cursor.execute(
                        """INSERT INTO credit_ledger (org_id, transaction_type, amount_inr, credits, balance_after, description, created_by)
                           VALUES (%s, 'scan_debit', %s, -1, %s, %s, 'system')""",
                        (org_id, -COST_PER_SCAN_INR, new_bal, f"Auto-replenish scan for {fingerprint[:16]}...")
                    )
                    return True
                    
            # Try partner
            partner_id = org.get("partner_id")
            if partner_id:
                cursor.execute("SELECT credit_balance FROM partners WHERE id = %s", (partner_id,))
                partner = cursor.fetchone()
                if partner and partner.get("credit_balance", 0) > 0:
                    cursor.execute("UPDATE partners SET credit_balance = credit_balance - 1 WHERE id = %s AND credit_balance > 0", (partner_id,))
                    if cursor.rowcount > 0:
                        cursor.execute("UPDATE devices SET total_scans = total_scans + 1, scans_used = scans_used + 1, last_seen = %s WHERE fingerprint = %s", (now, fingerprint))
                        
                        # Ledger entry
                        cursor.execute("SELECT credit_balance FROM partners WHERE id = %s", (partner_id,))
                        new_bal = cursor.fetchone()["credit_balance"]
                        cursor.execute(
                            """INSERT INTO credit_ledger (partner_id, org_id, transaction_type, amount_inr, credits, balance_after, description, created_by)
                               VALUES (%s, %s, 'scan_debit', %s, -1, %s, %s, 'system')""",
                            (partner_id, org_id, -COST_PER_SCAN_INR, new_bal, f"Partner auto-replenish scan for {fingerprint[:16]}...")
                        )
                        return True
                        
            return False
    finally:
        conn.close()

def add_scans(fingerprint, count):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE devices SET total_scans = total_scans + %s WHERE fingerprint = %s", (count, fingerprint))
    finally:
        conn.close()

def get_all_devices(org_id=None):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if org_id and org_id.startswith("__PARTNER_SCOPE__:"):
                # Partner scope: get all devices from partner's assigned orgs
                partner_id = int(org_id.split(":")[1])
                cursor.execute("SELECT id FROM organizations WHERE partner_id = %s", (partner_id,))
                org_ids = [r["id"] for r in cursor.fetchall()]
                if not org_ids:
                    return []
                placeholders = ", ".join(["%s"] * len(org_ids))
                cursor.execute(f"SELECT * FROM devices WHERE org_id IN ({placeholders}) ORDER BY last_seen DESC", org_ids)
            elif org_id:
                cursor.execute("SELECT * FROM devices WHERE org_id = %s ORDER BY last_seen DESC", (org_id,))
            else:
                cursor.execute("SELECT * FROM devices ORDER BY last_seen DESC")
            
            devices = cursor.fetchall()
            for device in devices:
                device["scans_remaining"] = device["total_scans"] - device["scans_used"]
                device["online"] = _compute_online_status(device.get("last_seen"))
            return devices
    finally:
        conn.close()

def save_scan_result(fingerprint, scan_data, health_data=None, compatibility_data=None):
    conn = get_db_connection()
    try:
        score, grade = 0, "?"
        if health_data and isinstance(health_data, dict):
            overall = health_data.get("overall", {})
            score, grade = overall.get("score", 0), overall.get("grade", "?")

        with conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO scan_results (fingerprint, timestamp, scan_data, health_data, 
                   compatibility_data, overall_score, overall_grade) VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (fingerprint, _utcnow_iso(),
                 json.dumps(scan_data), json.dumps(health_data), json.dumps(compatibility_data),
                 score, grade)
            )
            cursor.execute("UPDATE devices SET last_seen = %s WHERE fingerprint = %s", 
                           (_utcnow_iso(), fingerprint))
            # DPDPA data minimisation: keep only N most recent scans per device
            cursor.execute(f"""
                DELETE FROM scan_results
                WHERE fingerprint = %s
                  AND id NOT IN (
                      SELECT id FROM (
                          SELECT id FROM scan_results
                          WHERE fingerprint = %s
                          ORDER BY timestamp DESC
                          LIMIT {SCAN_RETENTION_PER_DEVICE}
                      ) AS keep_rows
                  )
            """, (fingerprint, fingerprint))
    finally:
        conn.close()

def save_system_audit(fingerprint, audits_data):
    """Save system optimization and security audit data."""
    if not audits_data:
        return
        
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO system_audits 
                   (fingerprint, temp_waste_gb, startup_count, security_score, 
                    bloatware_count, software_boost_pct, hardware_boost_pct, cleanup_performed) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    fingerprint,
                    audits_data.get("temp_waste_gb", 0),
                    audits_data.get("startup_programs", 0),
                    audits_data.get("security_score", 0),
                    audits_data.get("bloatware_count", 0),
                    audits_data.get("performance_split", {}).get("software_gain_pct", 0),
                    audits_data.get("performance_split", {}).get("hardware_gain_pct", 0),
                    audits_data.get("cleanup_performed", 0)
                )
            )
            
            # Keep only the latest 5 per device to prevent unlimited growth
            cursor.execute("""
                DELETE FROM system_audits
                WHERE fingerprint = %s
                  AND id NOT IN (
                      SELECT id FROM (
                          SELECT id FROM system_audits
                          WHERE fingerprint = %s
                          ORDER BY scanned_at DESC
                          LIMIT 5
                      ) as keep
                  )
            """, (fingerprint, fingerprint))
    finally:
        conn.close()

def save_tamper_alert(fingerprint, org_name, tamper_data):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("INSERT INTO tamper_alerts (fingerprint, timestamp, org_name, tamper_data) VALUES (%s, %s, %s, %s)",
                           (fingerprint, _utcnow_iso(), org_name, json.dumps(tamper_data)))
    finally:
        conn.close()

def get_tamper_alerts(resolved=False, include_all=False):
    """Get tamper alerts. If include_all=True, returns both resolved and unresolved."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if include_all:
                cursor.execute("SELECT * FROM tamper_alerts ORDER BY timestamp DESC LIMIT 200")
            else:
                cursor.execute("SELECT * FROM tamper_alerts WHERE resolved = %s ORDER BY timestamp DESC LIMIT 200", (1 if resolved else 0,))
            return cursor.fetchall()
    finally:
        conn.close()

def resolve_tamper_alert(alert_id, resolved_by=None):
    """Mark a tamper alert as resolved. Returns True on success."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE tamper_alerts SET resolved = 1, resolved_at = %s, resolved_by = %s WHERE id = %s AND resolved = 0",
                (_utcnow_iso(), resolved_by, alert_id)
            )
            if cursor.rowcount > 0:
                log_audit_event(None, resolved_by or "system", "TAMPER_ALERT_RESOLVED", "tamper_alert", str(alert_id))
                return True
            return False
    except Exception:
        return False
    finally:
        conn.close()

def get_latest_scan(fingerprint: str) -> Optional[dict]:
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM scan_results WHERE fingerprint = %s ORDER BY timestamp DESC LIMIT 1", (fingerprint,))
            result = cursor.fetchone()
            if not result: 
                return None
            for field in ["scan_data", "health_data", "compatibility_data"]:
                if result.get(field):
                    try: 
                        result[field] = json.loads(result[field])
                    except (json.JSONDecodeError, TypeError):
                        pass
            return result
    finally:
        conn.close()


def get_scan_history(fingerprint: str, limit: int = 20) -> list:
    """Get scan history for a device — lightweight summaries (no large JSON blobs)."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """SELECT id, fingerprint, overall_score, overall_grade, timestamp 
                   FROM scan_results WHERE fingerprint = %s 
                   ORDER BY timestamp DESC LIMIT %s""",
                (fingerprint, limit)
            )
            return cursor.fetchall()
    finally:
        conn.close()


def get_latest_scans_batch(fingerprints: list[str]) -> dict[str, dict]:
    """Fetch the latest scan for multiple devices in a single query. Returns {fingerprint: scan_dict}.
    
    This replaces the N+1 pattern of calling get_latest_scan() in a loop.
    """
    if not fingerprints:
        return {}
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            placeholders = ','.join(['%s'] * len(fingerprints))
            cursor.execute(f"""
                SELECT sr.* FROM scan_results sr
                INNER JOIN (
                    SELECT fingerprint, MAX(id) as max_id
                    FROM scan_results
                    WHERE fingerprint IN ({placeholders})
                    GROUP BY fingerprint
                ) latest ON sr.id = latest.max_id
            """, fingerprints)
            rows = cursor.fetchall()
            result = {}
            for row in rows:
                for field in ["scan_data", "health_data", "compatibility_data"]:
                    if row.get(field):
                        try:
                            row[field] = json.loads(row[field])
                        except (json.JSONDecodeError, TypeError):
                            pass
                result[row["fingerprint"]] = row
            return result
    finally:
        conn.close()

def get_org(org_id):
    """Get a single organization by ID."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM organizations WHERE id = %s", (org_id,))
            return cursor.fetchone()
    finally:
        conn.close()

def get_all_orgs():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM organizations ORDER BY name")
            return cursor.fetchall()
    finally:
        conn.close()

def create_org(org_id, name, email=None, phone=None, address=None, partner_id=None, org_category="Corporate"):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO organizations (id, name, contact_email, contact_phone, address, partner_id, org_category) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE 
                   name=VALUES(name), contact_email=VALUES(contact_email), 
                   contact_phone=VALUES(contact_phone), address=VALUES(address),
                   partner_id=VALUES(partner_id), org_category=VALUES(org_category)""",
                (org_id, name, email, phone, address, partner_id, org_category)
            )
    finally:
        conn.close()

def get_fleet_stats(org_id=None):
    """Bug #6 fix: single JOIN query instead of N+1 calls to get_latest_scan()."""
    devices = get_all_devices(org_id)
    total = len(devices)
    online = sum(1 for d in devices if d.get("online"))
    
    # Get the device fingerprints for scoped queries
    device_fps = [d["fingerprint"] for d in devices]
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Alerts count — scoped to devices the user can see
            if device_fps:
                placeholders = ", ".join(["%s"] * len(device_fps))
                cursor.execute(f"SELECT COUNT(*) as cnt FROM tamper_alerts WHERE resolved = 0 AND fingerprint IN ({placeholders})", device_fps)
            elif org_id:
                cursor.execute("SELECT 0 as cnt")
            else:
                cursor.execute("SELECT COUNT(*) as cnt FROM tamper_alerts WHERE resolved = 0")
            row = cursor.fetchone()
            alerts_count = row['cnt'] if row else 0
            
            # Upgrade count — scoped to devices the user can see
            if device_fps:
                cursor.execute(f"""
                    SELECT COUNT(*) as cnt FROM (
                        SELECT sr.overall_grade
                        FROM scan_results sr
                        INNER JOIN (
                            SELECT fingerprint, MAX(id) as max_id 
                            FROM scan_results GROUP BY fingerprint
                        ) latest ON sr.id = latest.max_id
                        WHERE sr.fingerprint IN ({placeholders}) AND sr.overall_grade IN ('D', 'F')
                    ) upgrade_devices
                """, device_fps)
            elif org_id:
                cursor.execute("SELECT 0 as cnt")
            else:
                cursor.execute("""
                    SELECT COUNT(*) as cnt FROM (
                        SELECT sr.overall_grade
                        FROM scan_results sr
                        INNER JOIN (
                            SELECT fingerprint, MAX(id) as max_id 
                            FROM scan_results GROUP BY fingerprint
                        ) latest ON sr.id = latest.max_id
                        WHERE sr.overall_grade IN ('D', 'F')
                    ) upgrade_devices
                """)
            upgrade_row = cursor.fetchone()
            needs_upgrade = upgrade_row['cnt'] if upgrade_row else 0
    finally:
        conn.close()

    return {
        "total_devices": total, "online": online, "offline": total - online,
        "active_alerts": alerts_count, "needs_upgrade": needs_upgrade,
    }


def get_fleet_health_summary(org_id=None):
    """Bug #18 fix: single JOIN query for grade distribution instead of N+1 calls."""
    devices = get_all_devices(org_id)
    grades = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0, "?": 0}
    replacement_items = []
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Single query to get latest grade per device
            if org_id:
                cursor.execute("""
                    SELECT d.fingerprint, d.hostname, d.org_name,
                           sr.overall_grade, sr.overall_score, sr.health_data
                    FROM devices d
                    LEFT JOIN (
                        SELECT fingerprint, MAX(id) as max_id 
                        FROM scan_results GROUP BY fingerprint
                    ) latest ON d.fingerprint = latest.fingerprint
                    LEFT JOIN scan_results sr ON sr.id = latest.max_id
                    WHERE d.org_id = %s
                """, (org_id,))
            else:
                cursor.execute("""
                    SELECT d.fingerprint, d.hostname, d.org_name,
                           sr.overall_grade, sr.overall_score, sr.health_data
                    FROM devices d
                    LEFT JOIN (
                        SELECT fingerprint, MAX(id) as max_id 
                        FROM scan_results GROUP BY fingerprint
                    ) latest ON d.fingerprint = latest.fingerprint
                    LEFT JOIN scan_results sr ON sr.id = latest.max_id
                """)
            
            rows = cursor.fetchall()
    finally:
        conn.close()
    
    for row in rows:
        grade = row.get("overall_grade") or "?"
        grades[grade] = grades.get(grade, 0) + 1
        
        # Collect devices needing attention
        if grade in ("D", "F"):
            health = row.get("health_data", {})
            if isinstance(health, str):
                try:
                    health = json.loads(health)
                except (json.JSONDecodeError, TypeError):
                    health = {}
            
            components_needing_attention = []
            if isinstance(health, dict):
                for comp_name, comp_data in health.get("components", {}).items():
                    if isinstance(comp_data, dict) and comp_data.get("replacement_flag") in ("critical", "warning"):
                        components_needing_attention.append({
                            "component": comp_name,
                            "grade": comp_data.get("grade", "?"),
                            "score": comp_data.get("score", 0),
                            "flag": comp_data.get("replacement_flag"),
                        })
            
            replacement_items.append({
                "hostname": row.get("hostname", "Unknown"),
                "fingerprint": row["fingerprint"],
                "org_name": row.get("org_name", "Unknown"),
                "overall_grade": grade,
                "overall_score": row.get("overall_score", 0),
                "components": components_needing_attention,
            })
    
    return {
        "grade_distribution": grades,
        "total_devices": len(devices),
        "healthy_count": grades.get("A", 0) + grades.get("B", 0),
        "warning_count": grades.get("C", 0),
        "critical_count": grades.get("D", 0) + grades.get("F", 0),
        "unscanned_count": grades.get("?", 0),
        "replacement_needed": replacement_items,
    }


def check_feature_flag(org_id, feature_name):
    """Check if a feature is enabled for an organization."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """SELECT * FROM feature_flags 
                   WHERE org_id = %s AND feature_name = %s AND enabled = 1""",
                (org_id, feature_name)
            )
            row = cursor.fetchone()
            if not row:
                return {"enabled": False, "reason": "Feature not unlocked"}
            
            # Check expiry
            if row.get("expires_at"):
                try:
                    expiry = datetime.datetime.fromisoformat(row["expires_at"])
                    if expiry.tzinfo is None:
                        expiry = expiry.replace(tzinfo=_UTC)
                    if datetime.datetime.now(_UTC) > expiry:
                        return {"enabled": False, "reason": "Feature license expired", "expired_at": row["expires_at"]}
                except Exception:
                    pass
            
            return {"enabled": True, "expires_at": row.get("expires_at")}
    finally:
        conn.close()


def set_feature_flag(org_id, feature_name, enabled=True, duration_days=None):
    """Enable or disable a feature for an organization."""
    conn = get_db_connection()
    try:
        expires_at = None
        if duration_days:
            expires_at = (datetime.datetime.now(_UTC) + datetime.timedelta(days=duration_days)).isoformat()
        
        with conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO feature_flags (org_id, feature_name, enabled, expires_at)
                   VALUES (%s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), expires_at = VALUES(expires_at)""",
                (org_id, feature_name, 1 if enabled else 0, expires_at)
            )
        return True
    except Exception as e:
        logger.error(f"Error setting feature flag: {e}")
        return False
    finally:
        conn.close()


def get_org_features(org_id):
    """Get all feature flags for an organization."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM feature_flags WHERE org_id = %s", (org_id,))
            return cursor.fetchall()
    finally:
        conn.close()


# ══════════════════════════════════════════
# PARTNER CRUD
# ══════════════════════════════════════════

def create_partner(name, code, contact_name=None, contact_email=None, contact_phone=None, address=None):
    """Create a new partner."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO partners (name, code, contact_name, contact_email, contact_phone, address)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (name, code.upper(), contact_name, contact_email, contact_phone, address)
            )
            return {"id": cursor.lastrowid, "name": name, "code": code.upper()}
    except pymysql.IntegrityError:
        return None  # Duplicate code
    finally:
        conn.close()


def get_partner(partner_id):
    """Get partner by ID."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM partners WHERE id = %s", (partner_id,))
            return cursor.fetchone()
    finally:
        conn.close()


def list_partners():
    """List all partners."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM partners ORDER BY name")
            partners = cursor.fetchall()
            # Enrich with org/device counts
            for p in partners:
                cursor.execute("SELECT COUNT(*) as cnt FROM organizations WHERE partner_id = %s", (p['id'],))
                p['org_count'] = cursor.fetchone()['cnt']
                cursor.execute(
                    """SELECT COUNT(*) as cnt FROM devices d
                       JOIN organizations o ON d.org_id = o.id
                       WHERE o.partner_id = %s""", (p['id'],)
                )
                p['device_count'] = cursor.fetchone()['cnt']
            return partners
    finally:
        conn.close()


def update_partner(partner_id, **kwargs):
    """Update partner fields."""
    allowed = ['name', 'code', 'contact_name', 'contact_email', 'contact_phone', 'address', 'is_active']
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        return False
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            set_clause = ", ".join(f"`{k}` = %s" for k in updates)
            values = list(updates.values()) + [partner_id]
            cursor.execute(f"UPDATE partners SET {set_clause} WHERE id = %s", values)
            return cursor.rowcount > 0
    finally:
        conn.close()


def delete_partner(partner_id):
    """Delete a partner and unlink its orgs."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE organizations SET partner_id = NULL WHERE partner_id = %s", (partner_id,))
            cursor.execute("UPDATE users SET is_active = 0 WHERE partner_id = %s", (partner_id,))
            cursor.execute("DELETE FROM partners WHERE id = %s", (partner_id,))
            return True
    finally:
        conn.close()


def get_orgs_by_partner(partner_id):
    """Get all organizations assigned to a partner."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM organizations WHERE partner_id = %s ORDER BY name", (partner_id,))
            orgs = cursor.fetchall()
            for org in orgs:
                cursor.execute("SELECT COUNT(*) as cnt FROM devices WHERE org_id = %s", (org['id'],))
                org['device_count'] = cursor.fetchone()['cnt']
            return orgs
    finally:
        conn.close()


def assign_org_to_partner(org_id, partner_id):
    """Assign an organization to a partner."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE organizations SET partner_id = %s WHERE id = %s", (partner_id, org_id))
            return cursor.rowcount > 0
    finally:
        conn.close()


def unassign_org_from_partner(org_id):
    """Remove an organization from its partner."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE organizations SET partner_id = NULL WHERE id = %s", (org_id,))
            return True
    finally:
        conn.close()


def get_partner_stats(partner_id):
    """Get aggregate stats for a partner's fleet."""
    orgs = get_orgs_by_partner(partner_id)
    org_ids = [o['id'] for o in orgs]
    if not org_ids:
        return {'total_orgs': 0, 'total_devices': 0, 'online': 0, 'offline': 0, 'alerts': 0}

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            placeholders = ','.join(['%s'] * len(org_ids))
            cursor.execute(f"SELECT * FROM devices WHERE org_id IN ({placeholders})", org_ids)
            devices = cursor.fetchall()
            total = len(devices)
            online = 0
            for d in devices:
                if _compute_online_status(d.get('last_seen')):
                    online += 1

            cursor.execute(
                f"""SELECT COUNT(*) as cnt FROM tamper_alerts ta
                    JOIN devices d ON ta.fingerprint = d.fingerprint
                    WHERE d.org_id IN ({placeholders}) AND ta.resolved = 0""",
                org_ids
            )
            alerts = cursor.fetchone()['cnt']

        return {
            'total_orgs': len(orgs),
            'total_devices': total,
            'online': online,
            'offline': total - online,
            'alerts': alerts,
        }
    finally:
        conn.close()


# ══════════════════════════════════════════
# USER CRUD
# ══════════════════════════════════════════

def _hash_password(password):
    """Hash a password with Argon2id (NIST SP 800-63B recommended)."""
    return _ph.hash(password)


def _verify_password(password, hashed):
    """Verify password against Argon2id hash, with bcrypt fallback for legacy accounts."""
    # Try Argon2id first (new accounts)
    if hashed.startswith('$argon2'):
        try:
            return _ph.verify(hashed, password)
        except VerifyMismatchError:
            return False
    # Fallback: bcrypt for legacy accounts
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_user(username, password, display_name, role, partner_id=None, org_id=None):
    """Create a new user account."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            password_hash = _hash_password(password)
            cursor.execute(
                """INSERT INTO users (username, password_hash, display_name, role, partner_id, org_id)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (username, password_hash, display_name, role, partner_id, org_id)
            )
            return {'id': cursor.lastrowid, 'username': username, 'role': role}
    except pymysql.IntegrityError:
        return None  # Duplicate username
    finally:
        conn.close()


def get_user_by_username(username):
    """Get user by username (for login)."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE username = %s AND is_active = 1", (username,))
            return cursor.fetchone()
    finally:
        conn.close()


def authenticate_user(username, password):
    """Authenticate a user. Returns user dict on success, None on failure.
    Blocks inactive or unapproved accounts."""
    user = get_user_by_username(username)
    if not user:
        return None
    if not _verify_password(password, user['password_hash']):
        return None
    # Block inactive accounts
    if not user.get('is_active', True):
        return None
    # Block unapproved accounts (super_admin is always approved)
    if user.get('role') != 'super_admin' and not user.get('is_approved', True):
        return None
    # Update last_login
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user['id'],))
    finally:
        conn.close()
    # Don't return the hash
    user.pop('password_hash', None)
    return user


def list_users():
    """List all users (without password hashes)."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT u.id, u.username, u.display_name, u.role, u.partner_id, u.org_id,
                       u.is_active, u.created_at, u.last_login,
                       p.name as partner_name
                FROM users u
                LEFT JOIN partners p ON u.partner_id = p.id
                ORDER BY u.role, u.username
            """)
            return cursor.fetchall()
    finally:
        conn.close()


def update_user(user_id, **kwargs):
    """Update user fields. If password is in kwargs, hash it."""
    allowed = ['username', 'display_name', 'role', 'partner_id', 'org_id', 'is_active']
    updates = {}
    for k, v in kwargs.items():
        if k == 'password' and v:
            updates['password_hash'] = _hash_password(v)
        elif k in allowed and v is not None:
            updates[k] = v
    if not updates:
        return False
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            set_clause = ", ".join(f"`{k}` = %s" for k in updates)
            values = list(updates.values()) + [user_id]
            cursor.execute(f"UPDATE users SET {set_clause} WHERE id = %s", values)
            return cursor.rowcount > 0
    finally:
        conn.close()


def delete_user(user_id):
    """Permanently delete a user. Cannot delete super_admin accounts for safety."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Safety: don't allow deleting the primary admin (id=1)
            cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if not user:
                return False
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            return cursor.rowcount > 0
    finally:
        conn.close()


def seed_admin_users():
    """Seed super_admin users from environment variables on first run."""
    admin_user = os.environ.get('ADMIN_USER', 'admin')
    admin_pass = os.environ.get('ADMIN_PASS')
    if not admin_pass:
        import secrets
        admin_pass = secrets.token_urlsafe(16)
        logger.warning(f"  WARNING: ADMIN_PASS not set — generated random password: {admin_pass}")
    admin_pass_2 = os.environ.get('ADMIN_PASS_2')

    existing = get_user_by_username(admin_user)
    if not existing:
        create_user(admin_user, admin_pass, 'Administrator', 'super_admin')
        logger.info(f"  Seeded super_admin user: {admin_user}")

    if admin_pass_2:
        existing2 = get_user_by_username('bostontech')
        if not existing2:
            create_user('bostontech', admin_pass_2, 'Bostontech Admin', 'super_admin')
            logger.info("  Seeded super_admin user: bostontech")


# Startup logic -> Do not auto-initialize DB globally here to prevent import errors during module parsing
def setup():
    try:
        init_db()
        seed_admin_users()
    except Exception as e:
        logger.warning(f"Warning: early DB init failed (maybe MySQL hasn't started yet): {e}")

setup()

# ══════════════════════════════════════════
# DPDPA COMPLIANCE FUNCTIONS
# ══════════════════════════════════════════

def log_audit_event(user_id, username, action, target_type=None, target_id=None, details=None, ip_address=None):
    """Log an event for DPDPA audit compliance."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute('''
                INSERT INTO audit_log 
                (user_id, username, action, target_type, target_id, details, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (user_id, username, action, target_type, target_id, details, ip_address))
            conn.commit()
    except Exception as e:
        logger.error(f"Audit log failed: {e}")
    finally:
        conn.close()

def get_audit_logs(limit=100, offset=0, username=None, action=None, date_from=None, date_to=None):
    """Get audit logs with optional filtering and pagination.
    
    Args:
        limit: Max rows to return (capped at 500).
        offset: Row offset for pagination.
        username: Filter by username (exact match).
        action: Filter by action type (exact match).
        date_from: ISO timestamp — only logs at or after this time.
        date_to: ISO timestamp — only logs before or at this time.
    """
    limit = min(int(limit), 500)
    offset = max(int(offset), 0)
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            conditions = []
            params = []

            if username:
                conditions.append("username = %s")
                params.append(username)
            if action:
                conditions.append("action = %s")
                params.append(action)
            if date_from:
                conditions.append("timestamp >= %s")
                params.append(date_from)
            if date_to:
                conditions.append("timestamp <= %s")
                params.append(date_to)

            where_clause = (" WHERE " + " AND ".join(conditions)) if conditions else ""

            # Get total count for pagination
            cursor.execute(f"SELECT COUNT(*) as total FROM audit_log{where_clause}", params)
            total = cursor.fetchone().get("total", 0)

            cursor.execute(
                f"SELECT * FROM audit_log{where_clause} ORDER BY timestamp DESC LIMIT %s OFFSET %s",
                params + [limit, offset]
            )
            return {"logs": cursor.fetchall(), "total": total, "limit": limit, "offset": offset}
    except Exception:
        return {"logs": [], "total": 0, "limit": limit, "offset": offset}
    finally:
        conn.close()


def get_scan_by_id(scan_id):
    """Get a single scan result by its ID — includes full JSON blobs for comparison."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM scan_results WHERE id = %s", (scan_id,))
            row = cursor.fetchone()
            if row:
                for field in ("scan_data", "health_data", "compatibility_data"):
                    if row.get(field):
                        try:
                            row[field] = json.loads(row[field])
                        except (json.JSONDecodeError, TypeError):
                            pass
            return row
    finally:
        conn.close()


def hard_delete_org_data(org_id):
    """Purge all data for an organization physically (DPDPA Right to Erasure)."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM heartbeats WHERE fingerprint IN (SELECT fingerprint FROM devices WHERE org_id = %s)", (org_id,))
            cursor.execute("DELETE FROM scan_results WHERE fingerprint IN (SELECT fingerprint FROM devices WHERE org_id = %s)", (org_id,))
            cursor.execute("DELETE FROM tamper_alerts WHERE fingerprint IN (SELECT fingerprint FROM devices WHERE org_id = %s)", (org_id,))
            cursor.execute("DELETE FROM amc_records WHERE fingerprint IN (SELECT fingerprint FROM devices WHERE org_id = %s)", (org_id,))
            cursor.execute("DELETE FROM devices WHERE org_id = %s", (org_id,))
            cursor.execute("DELETE FROM organizations WHERE id = %s", (org_id,))
            conn.commit()
            return True
    except Exception as e:
        logger.error(f"Error purging org data: {e}")
        return False
    finally:
        conn.close()


# ══════════════════════════════════════════
# CREDIT SYSTEM (₹25/scan)
# ══════════════════════════════════════════

COST_PER_SCAN_INR = 199


def add_credits_to_partner(partner_id, amount_inr, created_by=None):
    """Super admin adds ₹ credits to a partner. Auto-calculates scan count."""
    credits = int(amount_inr // COST_PER_SCAN_INR)
    if credits <= 0:
        return {"success": False, "error": f"Amount must be at least ₹{COST_PER_SCAN_INR}"}

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Get current balance
            cursor.execute("SELECT credit_balance FROM partners WHERE id = %s", (partner_id,))
            partner = cursor.fetchone()
            if not partner:
                return {"success": False, "error": "Partner not found"}

            new_balance = partner["credit_balance"] + credits

            # Update partner balance
            cursor.execute("""
                UPDATE partners
                SET credit_balance = %s,
                    total_credits_purchased = total_credits_purchased + %s,
                    total_spent_inr = total_spent_inr + %s
                WHERE id = %s
            """, (new_balance, credits, amount_inr, partner_id))

            # Record in ledger
            cursor.execute("""
                INSERT INTO credit_ledger
                (partner_id, org_id, transaction_type, amount_inr, credits, balance_after, description, created_by)
                VALUES (%s, NULL, 'purchase', %s, %s, %s, %s, %s)
            """, (partner_id, amount_inr, credits, new_balance,
                  f"₹{amount_inr:.0f} → {credits} scans @ ₹{COST_PER_SCAN_INR}/scan", created_by))

            conn.commit()
            return {
                "success": True,
                "credits_added": credits,
                "amount_inr": float(amount_inr),
                "new_balance": new_balance,
            }
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


def allocate_credits_to_org(partner_id, org_id, credits, created_by=None):
    """Partner allocates credits from their pool to an end-customer org."""
    if credits <= 0:
        return {"success": False, "error": "Credits must be positive"}

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Check partner balance
            cursor.execute("SELECT credit_balance FROM partners WHERE id = %s", (partner_id,))
            partner = cursor.fetchone()
            if not partner:
                return {"success": False, "error": "Partner not found"}
            if partner["credit_balance"] < credits:
                return {"success": False, "error": f"Insufficient credits. Available: {partner['credit_balance']}, Requested: {credits}"}

            # Check org exists and belongs to partner
            cursor.execute("SELECT id, credit_balance FROM organizations WHERE id = %s AND partner_id = %s", (org_id, partner_id))
            org = cursor.fetchone()
            if not org:
                return {"success": False, "error": "Organization not found or not assigned to your account"}

            new_partner_balance = partner["credit_balance"] - credits
            new_org_balance = org["credit_balance"] + credits

            # Debit partner
            cursor.execute("UPDATE partners SET credit_balance = %s WHERE id = %s", (new_partner_balance, partner_id))

            # Credit org
            cursor.execute("""
                UPDATE organizations
                SET credit_balance = %s, total_credits_purchased = total_credits_purchased + %s
                WHERE id = %s
            """, (new_org_balance, credits, org_id))

            # Ledger: partner debit
            cursor.execute("""
                INSERT INTO credit_ledger
                (partner_id, org_id, transaction_type, amount_inr, credits, balance_after, description, created_by)
                VALUES (%s, %s, 'allocation', %s, %s, %s, %s, %s)
            """, (partner_id, org_id, credits * COST_PER_SCAN_INR, credits, new_partner_balance,
                  f"Allocated {credits} scans to {org_id}", created_by))

            conn.commit()
            return {
                "success": True,
                "credits_allocated": credits,
                "partner_balance": new_partner_balance,
                "org_balance": new_org_balance,
            }
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


def consume_credit(org_id):
    """Consume one scan credit from an organization. Returns True if authorized."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Atomic debit
            cursor.execute("""
                UPDATE organizations SET credit_balance = credit_balance - 1
                WHERE id = %s AND credit_balance > 0
            """, (org_id,))
            if cursor.rowcount == 0:
                return False

            # Get new balance for ledger
            cursor.execute("SELECT credit_balance FROM organizations WHERE id = %s", (org_id,))
            org = cursor.fetchone()
            new_balance = org["credit_balance"] if org else 0

            # Record in ledger
            cursor.execute("""
                INSERT INTO credit_ledger
                (partner_id, org_id, transaction_type, amount_inr, credits, balance_after, description, created_by)
                VALUES (NULL, %s, 'scan_debit', %s, -1, %s, 'Scan consumed', 'system')
            """, (org_id, COST_PER_SCAN_INR, new_balance))

            conn.commit()
            return True
    except Exception:
        return False
    finally:
        conn.close()


def get_partner_credit_balance(partner_id):
    """Get partner credit balance and summary."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT credit_balance, total_credits_purchased, total_spent_inr
                FROM partners WHERE id = %s
            """, (partner_id,))
            partner = cursor.fetchone()
            if not partner:
                return None

            # Get allocated to orgs
            cursor.execute("""
                SELECT COALESCE(SUM(credit_balance), 0) as org_total,
                       COALESCE(SUM(total_credits_purchased), 0) as org_allocated
                FROM organizations WHERE partner_id = %s
            """, (partner_id,))
            org_sums = cursor.fetchone()

            return {
                "partner_balance": partner["credit_balance"],
                "total_purchased": partner["total_credits_purchased"],
                "total_spent_inr": float(partner["total_spent_inr"] or 0),
                "allocated_to_orgs": org_sums["org_allocated"] if org_sums else 0,
                "org_active_credits": org_sums["org_total"] if org_sums else 0,
                "cost_per_scan": COST_PER_SCAN_INR,
            }
    finally:
        conn.close()


def get_org_credit_balance(org_id):
    """Get organization credit balance."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT credit_balance, total_credits_purchased FROM organizations WHERE id = %s", (org_id,))
            org = cursor.fetchone()
            if not org:
                return None
            return {
                "credit_balance": org["credit_balance"],
                "total_purchased": org["total_credits_purchased"],
                "scans_remaining": org["credit_balance"],
                "cost_per_scan": COST_PER_SCAN_INR,
            }
    finally:
        conn.close()


def get_credit_ledger(partner_id=None, org_id=None, limit=50):
    """Get credit transaction history."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if partner_id:
                cursor.execute("""
                    SELECT cl.*, o.name as org_name, p.name as partner_name
                    FROM credit_ledger cl
                    LEFT JOIN organizations o ON cl.org_id = o.id
                    LEFT JOIN partners p ON cl.partner_id = p.id
                    WHERE cl.partner_id = %s
                    ORDER BY cl.created_at DESC LIMIT %s
                """, (partner_id, limit))
            elif org_id:
                cursor.execute("""
                    SELECT cl.*, o.name as org_name, p.name as partner_name
                    FROM credit_ledger cl
                    LEFT JOIN organizations o ON cl.org_id = o.id
                    LEFT JOIN partners p ON cl.partner_id = p.id
                    WHERE cl.org_id = %s
                    ORDER BY cl.created_at DESC LIMIT %s
                """, (org_id, limit))
            else:
                cursor.execute("""
                    SELECT cl.*, o.name as org_name, p.name as partner_name
                    FROM credit_ledger cl
                    LEFT JOIN organizations o ON cl.org_id = o.id
                    LEFT JOIN partners p ON cl.partner_id = p.id
                    ORDER BY cl.created_at DESC LIMIT %s
                """, (limit,))
            return cursor.fetchall()
    finally:
        conn.close()