"""
CatalystScan — Admin User Guide PDF Generator
Generates a professional PDF guide for CatalystScan Dashboard administrators.
"""

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import mm
import os
import datetime


# ── Constants ──
BRAND_BLUE = colors.HexColor("#1a56db")
BRAND_DARK = colors.HexColor("#1e293b")
BRAND_LIGHT = colors.HexColor("#f8fafc")
ACCENT_GREEN = colors.HexColor("#22c55e")
ACCENT_RED = colors.HexColor("#ef4444")
ACCENT_YELLOW = colors.HexColor("#eab308")
ACCENT_PURPLE = colors.HexColor("#8b5cf6")
TEXT_GRAY = colors.HexColor("#64748b")
TEXT_DARK = colors.HexColor("#0f172a")


def draw_header(c, width, height, title, subtitle=""):
    """Draw page header with brand bar."""
    c.setFillColor(BRAND_DARK)
    c.rect(0, height - 60, width, 60, fill=True, stroke=False)
    c.setFillColor(BRAND_BLUE)
    c.rect(0, height - 64, width, 4, fill=True, stroke=False)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(30, height - 40, title)
    if subtitle:
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.drawString(30, height - 54, subtitle)
    # Right side
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.drawRightString(width - 30, height - 40, "CatalystScan v2.1 Admin Guide")


def draw_footer(c, width, page_num):
    """Draw page footer."""
    c.setFillColor(TEXT_GRAY)
    c.setFont("Helvetica", 8)
    c.drawString(30, 25, f"© {datetime.datetime.now().year} Bostontech India Pvt Ltd — Confidential")
    c.drawRightString(width - 30, 25, f"Page {page_num}")


def draw_section_title(c, y, title, width, color=BRAND_BLUE):
    """Draw a section title with underline."""
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(30, y, title)
    c.setStrokeColor(color)
    c.setLineWidth(1.5)
    c.line(30, y - 4, width - 30, y - 4)
    return y - 24


def draw_text(c, y, text, size=10, color=TEXT_DARK, bold=False, indent=30):
    """Draw a line of text and return new Y."""
    c.setFillColor(color)
    font = "Helvetica-Bold" if bold else "Helvetica"
    c.setFont(font, size)
    c.drawString(indent, y, text)
    return y - (size + 4)


def draw_bullet(c, y, text, indent=40, size=10):
    """Draw a bullet point."""
    c.setFillColor(BRAND_BLUE)
    c.circle(indent - 5, y + 3, 2.5, fill=True, stroke=False)
    c.setFillColor(TEXT_DARK)
    c.setFont("Helvetica", size)
    c.drawString(indent, y, text)
    return y - (size + 5)


def draw_info_box(c, y, title, content, width, color=BRAND_BLUE):
    """Draw an info box."""
    box_height = 16 + len(content) * 15
    c.setFillColor(colors.HexColor("#f0f4ff"))
    c.roundRect(30, y - box_height + 10, width - 60, box_height, 6, fill=True, stroke=False)
    c.setFillColor(color)
    c.rect(30, y - box_height + 10, 4, box_height, fill=True, stroke=False)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(42, y, title)
    y -= 15
    c.setFont("Helvetica", 9)
    c.setFillColor(TEXT_DARK)
    for line in content:
        c.drawString(42, y, line)
        y -= 14
    return y - 8


def draw_credential_box(c, y, username, password, role, width):
    """Draw a credential display box."""
    box_h = 52
    c.setFillColor(colors.HexColor("#0f172a"))
    c.roundRect(30, y - box_h + 10, width - 60, box_h, 6, fill=True, stroke=False)
    c.setFillColor(ACCENT_GREEN)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(45, y, f"Role: {role}")
    c.setFillColor(colors.white)
    c.setFont("Courier", 11)
    c.drawString(45, y - 18, f"Username:  {username}")
    c.drawString(45, y - 34, f"Password:  {password}")
    return y - box_h - 10


def generate_admin_guide(output_path):
    """Generate the full Admin User Guide PDF."""
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    page = 1

    # ══════════════════════════════════════════
    # PAGE 1: COVER PAGE
    # ══════════════════════════════════════════
    c.setFillColor(BRAND_DARK)
    c.rect(0, 0, width, height, fill=True, stroke=False)
    
    # Brand gradient bar
    c.setFillColor(BRAND_BLUE)
    c.rect(0, height - 8, width, 8, fill=True, stroke=False)
    c.setFillColor(ACCENT_PURPLE)
    c.rect(width / 2, height - 8, width / 2, 8, fill=True, stroke=False)
    
    # Logo area
    c.setFillColor(BRAND_BLUE)
    c.roundRect(width / 2 - 50, height - 250, 100, 100, 16, fill=True, stroke=False)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 42)
    c.drawCentredString(width / 2, height - 210, "CS")
    
    # Title
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(width / 2, height - 300, "CatalystScan")
    c.setFont("Helvetica", 16)
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.drawCentredString(width / 2, height - 325, "Fleet Monitor Dashboard")
    
    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(BRAND_BLUE)
    c.drawCentredString(width / 2, height - 380, "Administrator User Guide")
    
    c.setFont("Helvetica", 11)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawCentredString(width / 2, height - 420, f"Version 2.1  |  {datetime.datetime.now().strftime('%B %Y')}")
    
    # Footer info
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawCentredString(width / 2, 80, "Bostontech India Pvt Ltd")
    c.drawCentredString(width / 2, 65, "Professional Academic Hardware Solutions")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#334155"))
    c.drawCentredString(width / 2, 45, "CONFIDENTIAL — For authorized administrators only")
    
    c.showPage()
    page += 1

    # ══════════════════════════════════════════
    # PAGE 2: TABLE OF CONTENTS
    # ══════════════════════════════════════════
    draw_header(c, width, height, "Table of Contents")
    y = height - 100

    toc_items = [
        ("1.", "Getting Started — Login & Navigation", "3"),
        ("2.", "Dashboard Overview — Fleet Statistics", "3"),
        ("3.", "Device Management — View & Manage Devices", "4"),
        ("4.", "Organization Management", "4"),
        ("5.", "License & Scan Credit Management", "5"),
        ("6.", "Building .exe Packages for Clients", "5"),
        ("7.", "E-Waste Compliance Reporting", "6"),
        ("8.", "AMC / Warranty Tracker", "6"),
        ("9.", "Reports & Data Export", "7"),
        ("10.", "Lab Utilization Analysis", "7"),
        ("11.", "Multi-Organization SI Dashboard", "8"),
        ("12.", "Alert & Notification Configuration", "8"),
        ("13.", "Network Scanner (Feature-Gated)", "9"),
        ("14.", "Admin Credentials & Security", "9"),
        ("15.", "Troubleshooting & FAQs", "10"),
    ]

    for num, title, pg in toc_items:
        c.setFillColor(BRAND_BLUE)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(40, y, num)
        c.setFillColor(TEXT_DARK)
        c.setFont("Helvetica", 11)
        c.drawString(65, y, title)
        c.setFillColor(TEXT_GRAY)
        c.setFont("Helvetica", 10)
        # Dotted line
        dots = "." * 60
        dots_w = c.stringWidth(dots, "Helvetica", 8)
        title_w = c.stringWidth(title, "Helvetica", 11)
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#cbd5e1"))
        c.drawString(65 + title_w + 8, y + 1, dots[:max(1, int((width - 130 - title_w) / 3))])
        c.setFillColor(TEXT_GRAY)
        c.setFont("Helvetica", 10)
        c.drawRightString(width - 40, y, pg)
        y -= 22

    draw_footer(c, width, page)
    c.showPage()
    page += 1

    # ══════════════════════════════════════════
    # PAGE 3: LOGIN & OVERVIEW
    # ══════════════════════════════════════════
    draw_header(c, width, height, "1. Getting Started", "Login & Dashboard Navigation")
    y = height - 100

    y = draw_section_title(c, y, "1.1 Admin Login", width)
    y = draw_text(c, y, "The CatalystScan dashboard requires admin authentication. Navigate to:")
    y -= 4
    y = draw_text(c, y, "https://catalystscan.bostontechindia.in/dashboard/", bold=True, color=BRAND_BLUE, indent=40)
    y -= 8
    y = draw_text(c, y, "Default Admin Credentials:")
    y -= 4
    y = draw_credential_box(c, y, "admin", "CatalystAdmin@2026", "Super Administrator", width)
    y = draw_credential_box(c, y, "bostontech", "Boston@2026", "Administrator", width)
    
    y -= 4
    y = draw_info_box(c, y, "⚠ SECURITY NOTE", [
        "Change default passwords in production by setting ADMIN_PASS env variable.",
        "Sessions are stored in browser sessionStorage and cleared on tab close.",
    ], width, ACCENT_YELLOW)

    y -= 10
    y = draw_section_title(c, y, "2. Dashboard Overview", width)
    y = draw_text(c, y, "The Overview page shows real-time fleet statistics:")
    y = draw_bullet(c, y, "Total Devices — All registered scanner clients across organizations")
    y = draw_bullet(c, y, "Online / Offline — Real-time status based on heartbeat (5-min interval)")
    y = draw_bullet(c, y, "Scans Used — Total scans consumed across the fleet")
    y = draw_bullet(c, y, "Active Alerts — Tamper/theft alerts requiring attention")
    y = draw_bullet(c, y, "Fleet Health — Grade distribution (A/B/C/D/F) with auto-refresh every 30s")

    draw_footer(c, width, page)
    c.showPage()
    page += 1

    # ══════════════════════════════════════════
    # PAGE 4: DEVICE & ORG MANAGEMENT
    # ══════════════════════════════════════════
    draw_header(c, width, height, "3. Device Management", "Viewing, Editing, and Managing Devices")
    y = height - 100

    y = draw_section_title(c, y, "3.1 Device List", width)
    y = draw_text(c, y, "Navigate to Devices to see all registered scanner clients:")
    y = draw_bullet(c, y, "Hostname, Fingerprint, Organization, Last Seen, Scan Credits")
    y = draw_bullet(c, y, "Click any device row to view detailed hardware specs & scan results")
    y = draw_bullet(c, y, "Add scan credits: Enter fingerprint + count in the Licenses page")
    y -= 8
    y = draw_text(c, y, "Devices auto-register when a scanner .exe first connects to the server.")
    
    y -= 16
    y = draw_section_title(c, y, "3.2 DB Explorer", width)
    y = draw_text(c, y, "Direct access to MySQL database tables for advanced queries:")
    y = draw_bullet(c, y, "Select table: devices, organizations, scan_results, heartbeats, etc.")
    y = draw_bullet(c, y, "View raw data with JSON expansion for scan_data, health_data columns")
    
    y -= 16
    y = draw_section_title(c, y, "4. Organization Management", width)
    y = draw_text(c, y, "Navigate to Organizations to manage customer accounts:")
    y = draw_bullet(c, y, "Create Organization — Set org_id, name, contact email, phone, address")
    y = draw_bullet(c, y, "View linked devices and aggregate scan statistics per org")
    y = draw_bullet(c, y, "Feature flags: Enable/disable network scanning per org")
    y -= 8
    y = draw_info_box(c, y, "💡 TIP", [
        "Each .exe package is bound to an org_id via org_config.json.",
        "Build custom .exe packages per client from the Build .exe page.",
    ], width, ACCENT_GREEN)

    draw_footer(c, width, page)
    c.showPage()
    page += 1

    # ══════════════════════════════════════════
    # PAGE 5: LICENSES & EXE BUILDER
    # ══════════════════════════════════════════
    draw_header(c, width, height, "5. License Management", "Scan Credits & Bulk Allocation")
    y = height - 100

    y = draw_section_title(c, y, "5.1 Scan Credits", width)
    y = draw_text(c, y, "Each device starts with a default scan credit allocation (typically 2 scans).")
    y = draw_text(c, y, "To add more credits:")
    y = draw_bullet(c, y, "Licenses page → Enter device fingerprint + credit count → Add")
    y = draw_bullet(c, y, "Reports → Bulk License Manager → Paste CSV of fingerprint,count")
    y = draw_bullet(c, y, "API: POST /api/dashboard/bulk-license/org/{org_id} for org-wide add")
    
    y -= 16
    y = draw_section_title(c, y, "6. Building .exe Packages", width)
    y = draw_text(c, y, "Create org-specific scanner executables for distribution:")
    y = draw_bullet(c, y, "Navigate to Build .exe page")
    y = draw_bullet(c, y, "Enter: Organization Name, Org ID, Telemetry URL, Default Scan Limit")
    y = draw_bullet(c, y, "Click Build — downloads a ZIP with the configured CatalystScan.exe")
    y -= 8
    y = draw_info_box(c, y, "📦 DISTRIBUTION", [
        "The .exe is self-contained — no Python installation needed on client PCs.",
        "Each .exe auto-registers with the dashboard on first scan.",
        "Telemetry URL should point to your GCP VM: http://35.244.19.7:8090",
    ], width, BRAND_BLUE)

    draw_footer(c, width, page)
    c.showPage()
    page += 1

    # ══════════════════════════════════════════
    # PAGE 6: E-WASTE & AMC
    # ══════════════════════════════════════════
    draw_header(c, width, height, "7. E-Waste Compliance", "MoEFCC E-Waste Management Rules 2022")
    y = height - 100

    y = draw_section_title(c, y, "7.1 E-Waste Report", width)
    y = draw_text(c, y, "Navigate to E-Waste to see automated disposal categorization:")
    y = draw_bullet(c, y, "🟢 Keep — Systems < 5 years old with Grade A/B/C")
    y = draw_bullet(c, y, "🟡 Review — Systems 5-8 years old OR Grade D")
    y = draw_bullet(c, y, "🔴 E-Waste — Systems > 8 years old OR Grade F")
    y -= 8
    y = draw_text(c, y, "Uses BIOS date to calculate system age. Compliant with MoEFCC Rule 16.")
    
    y -= 16
    y = draw_section_title(c, y, "8. AMC / Warranty Tracker", width)
    y = draw_text(c, y, "Track Annual Maintenance Contracts and warranty expiry dates:")
    y = draw_bullet(c, y, 'Navigate to AMC Tracker → Click "Add AMC Record"')
    y = draw_bullet(c, y, "Fields: Device Fingerprint, Vendor, Contract Type, Start/End Dates, Cost")
    y = draw_bullet(c, y, "Auto-status: ✅ Active, ⚠ Expiring Soon (<30 days), ❌ Expired")
    y -= 8
    y = draw_info_box(c, y, "📅 CONTRACT TYPES", [
        "warranty — OEM warranty from manufacturer",
        "amc — Annual Maintenance Contract with third-party vendor",
        "camc — Comprehensive AMC (includes parts replacement)",
    ], width, ACCENT_PURPLE)

    draw_footer(c, width, page)
    c.showPage()
    page += 1

    # ══════════════════════════════════════════
    # PAGE 7: REPORTS & LAB UTIL
    # ══════════════════════════════════════════
    draw_header(c, width, height, "9. Reports & Exports", "AICTE/UGC, Software Audit, Bulk Tools")
    y = height - 100

    y = draw_section_title(c, y, "9.1 Export Reports Hub", width)
    y = draw_text(c, y, "Navigate to Reports to access all export tools:")
    y = draw_bullet(c, y, "📋 AICTE/UGC Asset Register — CSV with 15 required columns")
    y = draw_bullet(c, y, "♻ E-Waste Report — Links to E-Waste compliance view")
    y = draw_bullet(c, y, "💾 Software Audit — Cross-device software inventory for NAAC/NBA")
    y = draw_bullet(c, y, "🔑 Bulk License Manager — CSV upload for mass credit allocation")
    
    y -= 16
    y = draw_section_title(c, y, "10. Lab Utilization Analysis", width)
    y = draw_text(c, y, "Navigate to Lab Utilization to see PC usage patterns:")
    y = draw_bullet(c, y, "Based on heartbeat frequency — scanner sends pings every 5 minutes")
    y = draw_bullet(c, y, "Categories: 🟢 High (>60%), 🔵 Medium (20-60%), 🟡 Low (5-20%), 🔴 Idle (<5%)")
    y = draw_bullet(c, y, "Configurable period: 7, 30, or 90 days analysis window")
    y = draw_bullet(c, y, "Auto-recommendation for lab budget planning (UGC/AICTE)")
    y -= 8
    y = draw_text(c, y, "Visual utilization bars show per-device usage with heartbeat counts.")

    draw_footer(c, width, page)
    c.showPage()
    page += 1

    # ══════════════════════════════════════════
    # PAGE 8: MULTI-ORG & ALERTS
    # ══════════════════════════════════════════
    draw_header(c, width, height, "11. Multi-Org & Alert Config", "SI Dashboard & Notification Setup")
    y = height - 100

    y = draw_section_title(c, y, "11.1 Multi-Organization View", width)
    y = draw_text(c, y, "For System Integrators managing multiple college/institute clients:")
    y = draw_bullet(c, y, "Navigate to Multi-Org View for cross-org fleet overview")
    y = draw_bullet(c, y, "Each org card shows: device count, online/offline, health score, grades")
    y = draw_bullet(c, y, "Click any org to drill down into per-device details")
    y = draw_bullet(c, y, "Health score = weighted average: A=100, B=80, C=60, D=40, F=20")
    
    y -= 16
    y = draw_section_title(c, y, "12. Alert & Notification Config", width)
    y = draw_text(c, y, "Configure per-organization notification channels:")
    y = draw_bullet(c, y, "📧 Email — Set SMTP env vars (SMTP_HOST, SMTP_USER, SMTP_PASS)")
    y = draw_bullet(c, y, "🔗 Webhook — Slack, Microsoft Teams, or custom webhook URL")
    y = draw_bullet(c, y, "💬 WhatsApp — Requires WhatsApp Business API key (WHATSAPP_API_KEY)")
    y -= 8
    y = draw_text(c, y, "Alert Triggers:", bold=True)
    y = draw_bullet(c, y, "🚨 Tamper/Theft — Hardware component change detected")
    y = draw_bullet(c, y, "🔴 Device Offline — No heartbeat received")
    y = draw_bullet(c, y, "📉 Grade Drop — Health grade degradation")
    y = draw_bullet(c, y, "📅 AMC Expiry — Warranty/contract approaching end date")

    draw_footer(c, width, page)
    c.showPage()
    page += 1

    # ══════════════════════════════════════════
    # PAGE 9: NETWORK SCANNER & SECURITY
    # ══════════════════════════════════════════
    draw_header(c, width, height, "13. Network Scanner", "Feature-Gated Add-on & Security")
    y = height - 100

    y = draw_section_title(c, y, "13.1 Network Range Scanner", width)
    y = draw_text(c, y, "This is a gated premium feature, locked by default per organization.")
    y = draw_text(c, y, "To enable:")
    y = draw_bullet(c, y, "Go to Organizations → Select org → Enable 'network-scan' feature flag")
    y = draw_bullet(c, y, "Set access period: 60 days, 365 days, or custom duration")
    y -= 8
    y = draw_text(c, y, "Scanner capabilities (when unlocked):")
    y = draw_bullet(c, y, "ICMP Ping sweep across IP range")
    y = draw_bullet(c, y, "TCP port scanning on discovered hosts")
    y = draw_bullet(c, y, "OS fingerprinting via TTL analysis")
    y = draw_bullet(c, y, "WMI-based remote inventory (Windows hosts, requires credentials)")
    
    y -= 16
    y = draw_section_title(c, y, "14. Admin Credentials & Security", width, ACCENT_RED)
    y -= 4
    y = draw_text(c, y, "Default Login Credentials:", bold=True, size=11)
    y -= 4
    y = draw_credential_box(c, y, "admin", "CatalystAdmin@2026", "Super Admin", width)
    y = draw_credential_box(c, y, "bostontech", "Boston@2026", "Admin", width)
    
    y = draw_info_box(c, y, "🔒 SECURITY RECOMMENDATIONS", [
        "1. Change default passwords via ADMIN_PASS / ADMIN_PASS_2 env vars",
        "2. Use HTTPS (already configured via nginx + Let's Encrypt)",
        "3. Restrict dashboard access via IP allowlist in nginx.conf",
        "4. Rotate admin passwords quarterly",
        "5. Monitor /api/auth/login for brute-force attempts",
    ], width, ACCENT_RED)

    draw_footer(c, width, page)
    c.showPage()
    page += 1

    # ══════════════════════════════════════════
    # PAGE 10: TROUBLESHOOTING
    # ══════════════════════════════════════════
    draw_header(c, width, height, "15. Troubleshooting & FAQs", "Common Issues & Solutions")
    y = height - 100

    faqs = [
        ("Q: Scanner .exe shows 'License locked'",
         "A: Add scan credits via Licenses page or Bulk License Manager."),
        ("Q: Device shows 'Offline' even though PC is running",
         "A: Check network — scanner needs internet to send heartbeats to server."),
        ("Q: Dashboard not loading",
         "A: Check if Docker containers are running: sudo docker compose ps"),
        ("Q: Network scan button not visible",
         "A: Feature is locked. Enable via Organizations → Feature Flags."),
        ("Q: E-Waste report shows all devices as 'Keep'",
         "A: BIOS date may not be available. Devices need a full scan first."),
        ("Q: AICTE CSV download is empty",
         "A: Ensure devices have completed at least one scan with telemetry."),
        ("Q: Webhook test fails",
         "A: Verify webhook URL. For Slack, use Incoming Webhooks integration."),
        ("Q: Email alerts not sent",
         "A: Configure SMTP env vars in docker-compose.yml or .env file."),
    ]

    for q, a in faqs:
        y = draw_text(c, y, q, bold=True, size=10, color=BRAND_BLUE)
        y = draw_text(c, y, a, size=9, color=TEXT_DARK, indent=40)
        y -= 8
        if y < 80:
            draw_footer(c, width, page)
            c.showPage()
            page += 1
            draw_header(c, width, height, "15. Troubleshooting (cont.)")
            y = height - 100

    y -= 16
    y = draw_section_title(c, y, "Support Contact", width, ACCENT_GREEN)
    y = draw_text(c, y, "For technical support, contact:")
    y = draw_bullet(c, y, "Email: support@bostontechindia.in")
    y = draw_bullet(c, y, "Dashboard: https://catalystscan.bostontechindia.in")
    y = draw_bullet(c, y, "Documentation: Refer to this guide or contact your account manager")

    draw_footer(c, width, page)
    c.save()
    print(f"✅ Admin guide saved to: {output_path}")


if __name__ == "__main__":
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "CatalystScan_Admin_Guide_v2.1.pdf")
    generate_admin_guide(output_path)
