"""
CatalystScan — Professional PDF Report Generator
Multi-page report with health scores, compatibility matrix, and upgrade recommendations.
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch, mm
from reportlab.platypus import Table, TableStyle
import os
import datetime


# ── Colors ──
BRAND_BLUE = colors.HexColor("#1a56db")
BRAND_DARK = colors.HexColor("#1e293b")
BRAND_LIGHT = colors.HexColor("#f8fafc")
GRADE_COLORS = {
    "A": colors.HexColor("#22c55e"),
    "B": colors.HexColor("#84cc16"),
    "C": colors.HexColor("#eab308"),
    "D": colors.HexColor("#f97316"),
    "F": colors.HexColor("#ef4444"),
}
STATUS_COLORS = {
    "supported": colors.HexColor("#22c55e"),
    "minimum": colors.HexColor("#eab308"),
    "not_supported": colors.HexColor("#ef4444"),
}


def generate_pdf_report(system_info, benchmark_info, report_path,
                        health_data=None, compatibility_data=None,
                        org_name="Bostontech India", tamper_data=None,
                        cost_data=None, scan_time=None):
    """Generate a comprehensive multi-page PDF assessment report."""
    c = canvas.Canvas(report_path, pagesize=A4)
    width, height = A4

    # ── PAGE 1: Cover Page ──
    _draw_cover_page(c, width, height, system_info, health_data, org_name, scan_time)
    c.showPage()

    # ── PAGE 2: Executive Summary ──
    _draw_executive_summary(c, width, height, system_info, health_data, benchmark_info)
    c.showPage()

    # ── PAGE 3: Component Health Cards ──
    if health_data:
        _draw_component_cards(c, width, height, health_data)
        c.showPage()

    # ── PAGE 4: Benchmark Results ──
    _draw_benchmark_page(c, width, height, benchmark_info)
    c.showPage()

    # ── PAGE 5: Software Compatibility Matrix ──
    if compatibility_data:
        _draw_compatibility_matrix(c, width, height, compatibility_data)
        c.showPage()

    # ── PAGE 6: Anti-Theft Status ──
    if tamper_data is not None:
        _draw_tamper_status(c, width, height, tamper_data)
        c.showPage()

    # ── PAGE 7: Upgrade Recommendations ──
    _draw_recommendations(c, width, height, system_info, health_data, compatibility_data)
    c.showPage()

    # ── PAGE 8: Cost Estimation ──
    if cost_data and cost_data.get("items"):
        _draw_cost_estimation(c, width, height, cost_data)
        c.showPage()

    c.save()
    return report_path


def _draw_header(c, width, height, title, page_num=None):
    """Draw a standard page header."""
    c.setFillColor(BRAND_DARK)
    c.rect(0, height - 50, width, 50, fill=True, stroke=False)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(20, height - 35, title)
    if page_num:
        c.setFont("Helvetica", 9)
        c.drawRightString(width - 20, height - 35, f"Page {page_num}")
    c.setFillColor(colors.black)


def _draw_footer(c, width, scan_time=None):
    """Draw a standard page footer."""
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(colors.gray)
    display_time = scan_time if scan_time else datetime.datetime.now()
    c.drawCentredString(width / 2, 15, f"CatalystScan v2.0 | Scan Date: {display_time.strftime('%Y-%m-%d %H:%M')}")
    c.setFillColor(colors.black)


def _draw_cover_page(c, width, height, system_info, health_data, org_name, scan_time=None):
    """Draw the cover page with overall grade."""
    # Background
    c.setFillColor(BRAND_DARK)
    c.rect(0, height * 0.5, width, height * 0.5, fill=True, stroke=False)

    # Title
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width / 2, height - 100, "Hardware Assessment Report")

    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 130, org_name)

    c.setFont("Helvetica", 11)
    display_time = scan_time if scan_time else datetime.datetime.now()
    c.drawCentredString(width / 2, height - 160, f"Scan Date: {display_time.strftime('%B %d, %Y at %I:%M %p')}")

    # Overall Grade Circle
    if health_data:
        overall = health_data.get("overall", {})
        grade = overall.get("grade", "?")
        score = overall.get("score", 0)
        grade_color = GRADE_COLORS.get(grade, colors.gray)

        # Draw grade circle
        cx, cy = width / 2, height - 260
        c.setFillColor(grade_color)
        c.circle(cx, cy, 50, fill=True, stroke=False)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 36)
        c.drawCentredString(cx, cy - 12, grade)
        c.setFont("Helvetica", 12)
        c.drawCentredString(cx, cy - 30, f"{score}/100")

        c.setFont("Helvetica", 11)
        c.drawCentredString(width / 2, height - 330, f"Estimated Lifespan: {overall.get('estimated_lifespan', 'N/A')}")

    # System Info
    c.setFillColor(colors.black)
    y = height * 0.5 - 40
    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, y, "System Information")
    y -= 25

    os_info = system_info.get("os", {})
    info_lines = [
        f"Hostname: {os_info.get('hostname', 'Unknown')}",
        f"OS: {os_info.get('os_name', os_info.get('system', 'Unknown'))} {os_info.get('release', '')}",
        f"CPU: {system_info.get('cpu', {}).get('brand', 'Unknown')}",
        f"RAM: {system_info.get('ram', {}).get('total_gb', 0)} GB",
    ]

    c.setFont("Helvetica", 10)
    for line in info_lines:
        c.drawString(60, y, line)
        y -= 18

    _draw_footer(c, width)


def _draw_executive_summary(c, width, height, system_info, health_data, benchmark_info):
    """Draw the executive summary page."""
    _draw_header(c, width, height, "Executive Summary", 2)

    y = height - 80

    if health_data:
        overall = health_data.get("overall", {})

        # Overall Score
        c.setFont("Helvetica-Bold", 14)
        c.drawString(30, y, f"Overall System Health: {overall.get('score', 0)}/100 (Grade {overall.get('grade', '?')})")
        y -= 25

        c.setFont("Helvetica", 11)
        c.drawString(30, y, f"Estimated Remaining Lifespan: {overall.get('estimated_lifespan', 'N/A')}")
        y -= 35

        # Top Issues
        top_issues = overall.get("top_issues", [])
        if top_issues:
            c.setFont("Helvetica-Bold", 12)
            c.setFillColor(colors.HexColor("#dc2626"))
            c.drawString(30, y, "Critical Issues Detected:")
            c.setFillColor(colors.black)
            y -= 20

            c.setFont("Helvetica", 10)
            for issue in top_issues:
                c.drawString(50, y, f"• {issue}")
                y -= 16
        else:
            c.setFont("Helvetica-Bold", 12)
            c.setFillColor(colors.HexColor("#22c55e"))
            c.drawString(30, y, "No Critical Issues Detected")
            c.setFillColor(colors.black)

        y -= 30

    # Component Summary Table
    if health_data and health_data.get("components"):
        c.setFont("Helvetica-Bold", 12)
        c.drawString(30, y, "Component Health Summary")
        y -= 10

        components = health_data["components"]
        table_data = [["Component", "Score", "Grade", "Status"]]

        for key, comp in components.items():
            if comp is None:
                continue
            if isinstance(comp, list):
                for item in comp:
                    table_data.append([
                        item.get("name", key)[:35],
                        str(item.get("score", 0)),
                        item.get("grade", "?"),
                        item.get("replacement", {}).get("action", "N/A"),
                    ])
            else:
                table_data.append([
                    comp.get("name", key)[:35],
                    str(comp.get("score", 0)),
                    comp.get("grade", "?"),
                    comp.get("replacement", {}).get("action", "N/A"),
                ])

        table = Table(table_data, colWidths=[200, 50, 50, 220])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))

        tw, th = table.wrapOn(c, width - 60, height)
        table.drawOn(c, 30, y - th)

    _draw_footer(c, width)


def _draw_component_cards(c, width, height, health_data):
    """Draw detailed component cards with scores, grades, and life tips."""
    _draw_header(c, width, height, "Component Health Analysis", 3)

    y = height - 80
    components = health_data.get("components", {})

    for key, comp in components.items():
        if comp is None:
            continue

        items = comp if isinstance(comp, list) else [comp]

        for item in items:
            if y < 120:
                _draw_footer(c, width)
                c.showPage()
                _draw_header(c, width, height, "Component Health Analysis (cont.)")
                y = height - 80

            grade = item.get("grade", "?")
            grade_color = GRADE_COLORS.get(grade, colors.gray)

            # Component header bar
            c.setFillColor(grade_color)
            c.rect(30, y - 2, 8, 18, fill=True, stroke=False)
            c.setFillColor(colors.black)
            c.setFont("Helvetica-Bold", 11)
            c.drawString(45, y, f"{item.get('component', key)} — {item.get('name', 'Unknown')[:40]}")
            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(grade_color)
            c.drawRightString(width - 30, y, f"Grade {grade} ({item.get('score', 0)}/100)")
            c.setFillColor(colors.black)
            y -= 18

            # Part number and replacement
            c.setFont("Helvetica", 9)
            part_serial = item.get('part_number', 'N/A')
            if len(part_serial) > 38: part_serial = part_serial[:35] + "..."
            c.drawString(45, y, f"Part/Serial: {part_serial}")
            repl = item.get("replacement", {})
            c.drawString(280, y, f"Status: {repl.get('icon', '')} {repl.get('flag', 'N/A')}")
            y -= 15

            # Life extension tips
            tips = item.get("life_tips", [])
            if tips:
                c.setFont("Helvetica-Oblique", 8)
                c.setFillColor(colors.HexColor("#475569"))
                for tip in tips[:2]:
                    c.drawString(55, y, f"→ {tip}")
                    y -= 12
                c.setFillColor(colors.black)

            y -= 10  # spacing between cards

    _draw_footer(c, width)


def _draw_benchmark_page(c, width, height, benchmark_info):
    """Draw benchmark results page."""
    _draw_header(c, width, height, "Performance Benchmarks", 4)

    y = height - 80

    c.setFont("Helvetica-Bold", 12)
    c.drawString(30, y, f"Overall Benchmark Score: {benchmark_info.get('overall_score', 0)}/100")
    y -= 35

    benchmarks = [
        ("CPU Compute", benchmark_info.get("cpu", {})),
        ("Disk I/O", benchmark_info.get("disk", {})),
        ("Memory Bandwidth", benchmark_info.get("memory", {})),
    ]

    bar_width = 350
    bar_height = 25

    for name, data in benchmarks:
        score = data.get("normalized_score", 0)

        c.setFont("Helvetica-Bold", 10)
        c.drawString(30, y, name)
        c.setFont("Helvetica", 9)
        c.drawRightString(width - 30, y, f"{score}/100")
        y -= 5

        # Background bar
        c.setFillColor(colors.HexColor("#e2e8f0"))
        c.rect(30, y - bar_height, bar_width, bar_height, fill=True, stroke=False)

        # Score bar
        if score >= 70:
            bar_color = colors.HexColor("#22c55e")
        elif score >= 40:
            bar_color = colors.HexColor("#eab308")
        else:
            bar_color = colors.HexColor("#ef4444")

        score_width = (score / 100) * bar_width
        c.setFillColor(bar_color)
        c.rect(30, y - bar_height, score_width, bar_height, fill=True, stroke=False)

        c.setFillColor(colors.black)
        y -= bar_height + 8

        # Details
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.gray)
        baseline = data.get("baseline_reference", "")
        if baseline:
            c.drawString(30, y, f"Baseline: {baseline}")
            y -= 12

        if "speed_mbs" in data:
            c.drawString(30, y, f"Measured: {data['speed_mbs']} MB/s")
            y -= 12
        elif "throughput_mbs" in data:
            c.drawString(30, y, f"Measured: {data['throughput_mbs']} MB/s")
            y -= 12
        elif "raw_operations" in data:
            c.drawString(30, y, f"Measured: {data['raw_operations']} operations in {data.get('duration_seconds', 5)}s")
            y -= 12

        c.setFillColor(colors.black)
        y -= 20

    _draw_footer(c, width)


def _draw_compatibility_matrix(c, width, height, compatibility_data):
    """Draw software compatibility matrix page."""
    _draw_header(c, width, height, "Software Compatibility Matrix", 5)

    y = height - 80

    table_data = [["Category", "Status", "Bottlenecks"]]

    for item in compatibility_data:
        status_label = item.get("label", "Unknown")
        bottlenecks = "; ".join(item.get("bottlenecks", [])) or "None"
        if len(bottlenecks) > 60:
            bottlenecks = bottlenecks[:57] + "..."
        table_data.append([
            item.get("category", "Unknown"),
            status_label,
            bottlenecks,
        ])

    table = Table(table_data, colWidths=[130, 120, 280])
    style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
    ]

    # Color-code status cells
    for i, item in enumerate(compatibility_data, start=1):
        status = item.get("status", "")
        if status in STATUS_COLORS:
            style_commands.append(('TEXTCOLOR', (1, i), (1, i), STATUS_COLORS[status]))

    table.setStyle(TableStyle(style_commands))
    tw, th = table.wrapOn(c, width - 60, height)
    table.drawOn(c, 15, y - th)

    _draw_footer(c, width)


def _draw_tamper_status(c, width, height, tamper_data):
    """Draw anti-theft/tamper status page."""
    _draw_header(c, width, height, "Asset Protection Status", 6)

    y = height - 80

    if tamper_data.get("tampered"):
        c.setFillColor(colors.HexColor("#dc2626"))
        c.setFont("Helvetica-Bold", 16)
        c.drawString(30, y, "⚠ HARDWARE TAMPERING DETECTED")
        c.setFillColor(colors.black)
        y -= 30

        changes = tamper_data.get("changes", [])
        for change in changes:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(40, y, f"{change.get('component', 'Unknown')} — {change.get('type', 'CHANGED')}")
            y -= 15
            c.setFont("Helvetica", 9)
            if "baseline" in change:
                c.drawString(60, y, f"Baseline: {change['baseline']}")
                y -= 12
                c.drawString(60, y, f"Current:  {change['current']}")
                y -= 12
            elif "serial" in change:
                c.drawString(60, y, f"Serial: {change['serial']}")
                y -= 12
            c.setFont("Helvetica", 8)
            c.setFillColor(colors.gray)
            c.drawString(60, y, f"Severity: {change.get('severity', 'Unknown')}")
            c.setFillColor(colors.black)
            y -= 20
    else:
        c.setFillColor(colors.HexColor("#22c55e"))
        c.setFont("Helvetica-Bold", 16)
        c.drawString(30, y, "✓ No Hardware Tampering Detected")
        c.setFillColor(colors.black)
        y -= 25
        c.setFont("Helvetica", 10)
        c.drawString(30, y, "All hardware components match the registered baseline.")

    _draw_footer(c, width)


def _draw_recommendations(c, width, height, system_info, health_data, compatibility_data):
    """Draw upgrade recommendations page."""
    _draw_header(c, width, height, "Upgrade Recommendations", 7)

    y = height - 80
    recommendations = []

    if health_data:
        components = health_data.get("components", {})
        for key, comp in components.items():
            if comp is None:
                continue
            items = comp if isinstance(comp, list) else [comp]
            for item in items:
                if item.get("grade", "A") in ["D", "F"]:
                    action = item.get("replacement", {}).get("action", "Replace")
                    # Add integrated GPU specific note
                    if key == "gpu" and item.get("is_integrated", False):
                        action += " — INTEGRATED GPU: Motherboard + CPU replacement required. " \
                                  "Alternatively, add a discrete PCIe GPU (desktop only)."
                    recommendations.append({
                        "priority": "HIGH" if item["grade"] == "F" else "MEDIUM",
                        "component": item.get("component", key),
                        "name": item.get("name", "Unknown"),
                        "current_grade": item["grade"],
                        "action": action,
                    })

    if compatibility_data:
        for item in compatibility_data:
            if item.get("status") == "not_supported":
                for bottleneck in item.get("bottlenecks", []):
                    recommendations.append({
                        "priority": "HIGH",
                        "component": "System",
                        "name": item.get("category", ""),
                        "current_grade": "N/A",
                        "action": bottleneck,
                    })

    if recommendations:
        c.setFont("Helvetica-Bold", 12)
        c.drawString(30, y, f"Total Recommendations: {len(recommendations)}")
        y -= 25

        # Deduplicate
        seen = set()
        for rec in recommendations:
            key = f"{rec['component']}-{rec['action']}"
            if key in seen:
                continue
            seen.add(key)

            if y < 60:
                _draw_footer(c, width)
                c.showPage()
                _draw_header(c, width, height, "Upgrade Recommendations (cont.)")
                y = height - 80

            # Priority indicator
            if rec["priority"] == "HIGH":
                c.setFillColor(colors.HexColor("#ef4444"))
            else:
                c.setFillColor(colors.HexColor("#f97316"))
            c.circle(37, y + 3, 4, fill=True, stroke=False)
            c.setFillColor(colors.black)

            c.setFont("Helvetica-Bold", 9)
            c.drawString(48, y, f"[{rec['priority']}] {rec['component']}")
            y -= 14
            c.setFont("Helvetica", 9)
            c.drawString(48, y, rec["action"])
            y -= 18
    else:
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(colors.HexColor("#22c55e"))
        c.drawString(30, y, "✓ No Upgrades Required")
        c.setFillColor(colors.black)
        y -= 20
        c.setFont("Helvetica", 10)
        c.drawString(30, y, "This system meets the requirements for all assessed workloads.")

    _draw_footer(c, width)


def _draw_cost_estimation(c, width, height, cost_data):
    """Draw the hardware replacement cost estimation page."""
    _draw_header(c, width, height, "Hardware Replacement Cost Estimate", page_num=8)
    y = height - 80

    # Budget Summary Box
    c.setFillColor(colors.HexColor("#f0f9ff"))
    c.roundRect(25, y - 55, width - 50, 55, 8, fill=True, stroke=False)
    c.setFillColor(BRAND_DARK)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(35, y - 18, "Total Estimated Upgrade Cost")
    c.setFont("Helvetica-Bold", 20)
    total_inr = cost_data.get('total_inr', 0)
    total_usd = cost_data.get('total_usd', 0)
    c.setFillColor(BRAND_BLUE)
    c.drawString(35, y - 42, f"Rs. {total_inr:,.0f} INR")
    c.setFillColor(colors.HexColor("#64748b"))
    c.setFont("Helvetica", 12)
    c.drawString(230, y - 42, f"(~${total_usd:,.0f} USD)")
    y -= 75

    # Pricing date note
    c.setFillColor(colors.HexColor("#64748b"))
    c.setFont("Helvetica-Oblique", 8)
    pricing_date = cost_data.get('pricing_date', 'Unknown')
    c.drawString(35, y, f"Prices as of {pricing_date} | Sources: Amazon.in, MDComputers, PrimeABGB")
    y -= 25

    # Cost Table
    items = cost_data.get("items", [])
    if items:
        # Table header
        header = ["Priority", "Component", "Current", "Recommended Upgrade", "\u20b9 INR", "$ USD"]
        table_data = [header]

        priority_labels = {
            "critical": "\u26a0 MUST REPLACE",
            "warning": "\u26a1 SHOULD UPGRADE",
            "recommended": "\u2191 OPTIONAL",
            "good": "\u2713 GOOD",
        }

        for item in items:
            row = [
                priority_labels.get(item["priority"], item["priority"]),
                item["component"],
                item.get("current_spec", "-")[:22],
                item.get("recommended", "-")[:25],
                f"Rs. {item['inr']:,.0f}",
                f"${item['usd']:,.0f}",
            ]
            table_data.append(row)

        # Total row
        table_data.append(["", "", "", "TOTAL", f"Rs. {total_inr:,.0f}", f"${total_usd:,.0f}"])

        col_widths = [90, 65, 120, 130, 65, 55]
        table = Table(table_data, colWidths=col_widths)

        # Style
        style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BRAND_DARK),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#f0f9ff")),
            ('ALIGN', (-2, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor("#f8fafc")]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ])

        # Color-code priority column
        for i, item in enumerate(items, start=1):
            if item["priority"] == "critical":
                style.add('TEXTCOLOR', (0, i), (0, i), colors.HexColor("#ef4444"))
            elif item["priority"] == "warning":
                style.add('TEXTCOLOR', (0, i), (0, i), colors.HexColor("#f97316"))
            elif item["priority"] == "recommended":
                style.add('TEXTCOLOR', (0, i), (0, i), colors.HexColor("#3b82f6"))

        table.setStyle(style)
        tw, th = table.wrapOn(c, width - 50, height)
        table.drawOn(c, 30, y - th)
        y -= (th + 20)

    # Reason details
    if y > 120:
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(BRAND_DARK)
        c.drawString(30, y, "Upgrade Justification")
        y -= 18
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#475569"))
        for item in items:
            if y < 60:
                break
            reason = item.get("reason", "")
            source = item.get("source", "")
            c.drawString(40, y, f"\u2022 {item['component']}: {reason}")
            y -= 11
            c.setFillColor(colors.HexColor("#94a3b8"))
            c.drawString(50, y, f"Source: {source} ({item.get('source_url', '')[:60]})")
            c.setFillColor(colors.HexColor("#475569"))
            y -= 15

    # Disclaimer
    if y > 50:
        c.setFont("Helvetica-Oblique", 7)
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.drawString(30, 45, "* Prices are approximate and may vary. Consult your vendor for exact quotes. Currency rate: 1 USD = \u20b9" + f"{cost_data.get('currency_rate', 83.5):.1f}")

    _draw_footer(c, width)
