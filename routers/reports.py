"""Executive Report Generation — Rich PDF with charts & storytelling."""
import io, json, datetime, math, os, pathlib
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, Color
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Line, Wedge
from reportlab.graphics import renderPDF
from middleware import require_admin
import database as db

router = APIRouter()
W, H = A4
# Professional Navy Theme
C_PRIMARY = HexColor('#1e3a5f')
C_PRIMARY_LIGHT = HexColor('#e8eef4')
C_ACCENT = HexColor('#2e86de')
C_SUCCESS = HexColor('#27ae60')
C_SUCCESS_BG = HexColor('#eafaf1')
C_WARNING = HexColor('#f39c12')
C_WARNING_BG = HexColor('#fef9e7')
C_DANGER = HexColor('#e74c3c')
C_DANGER_BG = HexColor('#fdedec')
C_DARK = HexColor('#1a1a2e')
C_MUTED = HexColor('#7f8c8d')
C_LIGHT = HexColor('#f4f6f9')
C_WHITE = HexColor('#ffffff')
C_BORDER = HexColor('#d5dbe1')
C_GOLD = HexColor('#c9a94e')
GRADE_C = {'A': HexColor('#27ae60'), 'B': HexColor('#2e86de'), 'C': HexColor('#c9a94e'),
           'D': HexColor('#1e3a5f'), 'F': HexColor('#1a1a2e'), '?': HexColor('#d5dbe1')}

class ReportRequest(BaseModel):
    org_id: str
    report_type: str
    cost_per_replacement: Optional[int] = None
    phase_years: Optional[int] = 3

def _s():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle('CTitle', fontSize=32, textColor=C_PRIMARY, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=8))
    s.add(ParagraphStyle('CSub', fontSize=13, textColor=C_MUTED, alignment=TA_CENTER, spaceAfter=6))
    s.add(ParagraphStyle('Sec', fontSize=18, textColor=C_PRIMARY, fontName='Helvetica-Bold', spaceBefore=20, spaceAfter=12))
    s.add(ParagraphStyle('Sub', fontSize=13, textColor=C_DARK, fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=6))
    s.add(ParagraphStyle('Body', fontSize=10, textColor=C_DARK, leading=15))
    s.add(ParagraphStyle('Small', fontSize=8, textColor=C_MUTED, leading=11))
    s.add(ParagraphStyle('Callout', fontSize=11, textColor=C_DARK, leading=15, backColor=C_PRIMARY_LIGHT,
                         borderWidth=1, borderColor=C_PRIMARY, borderPadding=10, borderRadius=4))
    return s

def _gather(org_id):
    devices = db.get_all_devices(org_id)
    health = db.get_fleet_health_summary(org_id)
    fps = [d['fingerprint'] for d in devices]
    scans = db.get_latest_scans_batch(fps) if fps else {}
    enriched = []
    for d in devices:
        scan = scans.get(d['fingerprint'], {})
        sd, hd = scan.get('scan_data', {}), scan.get('health_data', {})
        if isinstance(sd, str):
            try: sd = json.loads(sd)
            except: sd = {}
        if isinstance(hd, str):
            try: hd = json.loads(hd)
            except: hd = {}
        enriched.append({
            'hostname': d.get('hostname', 'Unknown'), 'grade': scan.get('overall_grade', '?'),
            'score': scan.get('overall_score', 0), 'os': sd.get('os', {}),
            'cpu': sd.get('cpu', {}), 'ram': sd.get('ram', {}),
            'storage': sd.get('storage', {}), 'health': hd,
            'components': hd.get('components', {}) if isinstance(hd, dict) else {},
        })
    grades = health.get('grade_distribution', {})
    total = len(devices)
    avg = sum(d['score'] for d in enriched) / max(total, 1)
    ages = [d['os'].get('install_age_days', 0) for d in enriched if d['os'].get('install_age_days')]
    return {
        'devices': sorted(enriched, key=lambda x: x['score']),
        'grades': grades, 'total': total, 'avg_score': round(avg, 1),
        'avg_age': round(sum(ages)/max(len(ages),1)) if ages else 0,
        'healthy': grades.get('A',0)+grades.get('B',0),
        'warning': grades.get('C',0),
        'critical': grades.get('D',0)+grades.get('F',0),
    }

def _draw_pie(grades, total):
    # Centered Donut Chart
    d = Drawing(460, 160)
    cx, cy, r = 230, 80, 65
    if total == 0: return d
    angles = []
    for g in ['A','B','C','D','F','?']:
        cnt = grades.get(g, 0)
        if cnt > 0:
            angles.append((g, cnt, cnt/total*360))
    start = 0
    for g, cnt, angle in angles:
        w = Wedge(cx, cy, r, start, start+angle, fillColor=GRADE_C.get(g, C_MUTED), strokeColor=C_WHITE, strokeWidth=1.5)
        d.add(w)
        start += angle
    # Inner circle for Donut
    d.add(Circle(cx, cy, r*0.55, fillColor=C_WHITE, strokeWidth=0))
    
    # Legend
    ly = cy + (len(angles)*10)/2
    lx = cx + r + 30
    for g, cnt, _ in angles:
        d.add(Rect(lx, ly-4, 10, 10, fillColor=GRADE_C.get(g), strokeWidth=0))
        d.add(String(lx+15, ly-2, f"Grade {g}: {cnt}", fontSize=8, fillColor=C_DARK))
        ly -= 16
    return d

def _draw_bar(devices):
    d = Drawing(460, 130)
    if not devices: return d
    n = min(len(devices), 20)
    bw = min(18, 380/n)
    x0 = 35
    d.add(Line(x0, 10, x0, 110, strokeColor=C_BORDER))
    d.add(Line(x0, 10, x0+n*bw+10, 10, strokeColor=C_BORDER))
    for i, dev in enumerate(devices[:n]):
        sc = dev['score']
        h = max(sc, 2)
        c = GRADE_C.get(dev['grade'], C_MUTED)
        bx = x0 + 5 + i*bw
        d.add(Rect(bx, 10, bw-3, h, fillColor=c, strokeWidth=0))
        if n <= 12:
            d.add(String(bx, 2, dev['hostname'][:6], fontSize=5, fillColor=C_MUTED))
    for v in [0, 25, 50, 75, 100]:
        d.add(String(3, 10+v-3, str(v), fontSize=6, fillColor=C_MUTED))
        d.add(Line(x0, 10+v, x0+n*bw+10, 10+v, strokeColor=C_BORDER, strokeDashArray=[2,2]))
    d.add(String(x0, 118, "Device Health Scores (lowest to highest)", fontSize=8, fillColor=C_DARK, fontName='Helvetica-Bold'))
    return d

def _draw_timeline(critical, warning, cost, years):
    d = Drawing(470, 120)
    d.add(String(5, 108, f"Phase-wise Replacement Timeline ({years} Years)", fontSize=9, fillColor=C_DARK, fontName='Helvetica-Bold'))
    y0 = 70
    d.add(Line(40, y0, 450, y0, strokeColor=C_PRIMARY, strokeWidth=2))
    
    # Smart distribution: flatten the curve to balance budget across years
    total_sys = critical + warning
    per_yr = math.ceil(total_sys / max(years, 1))
    c_rem, w_rem = critical, warning
    
    for yr in range(years):
        x = 40 + yr * (410 / max(years, 1))
        d.add(Circle(x+20, y0, 8, fillColor=C_PRIMARY, strokeWidth=0))
        d.add(String(x+16, y0-3, str(yr+1), fontSize=8, fillColor=C_WHITE))
        nc = min(per_yr, c_rem)
        c_rem -= nc
        nw = min(per_yr - nc, w_rem)
        w_rem -= nw
        
        phase_cost = (nc + nw) * cost
        d.add(String(x+5, y0+14, f"Year {yr+1}", fontSize=7, fillColor=C_DARK, fontName='Helvetica-Bold'))
        d.add(String(x+5, y0-18, f"{nc+nw} systems", fontSize=7, fillColor=C_MUTED))
        d.add(String(x+5, y0-28, f"Rs.{phase_cost:,}", fontSize=7, fillColor=C_DANGER))
    total_cost = (critical + warning) * cost
    d.add(String(5, 15, f"Total Investment: Rs.{total_cost:,}  |  {critical} High Risk + {warning} Medium Risk", fontSize=8, fillColor=C_DARK))
    return d

def _metric_card(label, value, color=C_PRIMARY):
    d = Drawing(110, 50)
    d.add(Rect(0, 0, 110, 50, rx=6, ry=6, fillColor=C_WHITE, strokeColor=color, strokeWidth=1.5))
    d.add(String(55, 23, str(value), fontSize=18, fillColor=color, fontName='Helvetica-Bold', textAnchor='middle'))
    d.add(String(55, 10, label, fontSize=8, fillColor=C_MUTED, fontName='Helvetica', textAnchor='middle'))
    return d

def _tbl_style():
    return TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PRIMARY), ('TEXTCOLOR', (0,0), (-1,0), C_WHITE),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOX', (0,0), (-1,-1), 1.5, C_PRIMARY),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 7), ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [C_WHITE, C_LIGHT]),
    ])

def _header_footer(c, doc):
    c.saveState()
    # Header logo
    logo_path = str(pathlib.Path(__file__).parent.parent / "dashboard" / "logo.png")
    if os.path.exists(logo_path):
        c.drawImage(logo_path, 2*cm, H-1.8*cm, width=3.5*cm, preserveAspectRatio=True, mask='auto')
        
    # Footer
    c.setFillColor(C_PRIMARY); c.rect(0, 0, W, 1.2*cm, fill=1, stroke=0)
    c.setStrokeColor(C_GOLD); c.setLineWidth(1)
    c.line(0, 1.2*cm, W, 1.2*cm)
    c.setFont('Helvetica', 7); c.setFillColor(C_WHITE)
    c.drawString(2*cm, 0.5*cm, f"CatalystScan Report | {datetime.date.today().strftime('%b %d, %Y')}")
    c.drawCentredString(W/2, 0.5*cm, "Boston Tech India | https://bostontechindia.in")
    c.drawRightString(W-2*cm, 0.5*cm, f"Page {doc.page}")
    c.restoreState()

def _cover(c, doc, org, partner, title):
    c.saveState()
    # Full page navy background
    c.setFillColor(C_PRIMARY); c.rect(0, 0, W, H, fill=1, stroke=0)
    # Gold accent line
    c.setStrokeColor(C_GOLD); c.setLineWidth(2)
    c.line(2*cm, H-4*cm, W-2*cm, H-4*cm)
    c.line(2*cm, 5*cm, W-2*cm, 5*cm)
    # Logo text or image
    logo_path = str(pathlib.Path(__file__).parent.parent / "dashboard" / "logo.png")
    if os.path.exists(logo_path):
        c.setFillColor(C_WHITE); c.roundRect(2*cm - 0.2*cm, H-3.2*cm - 0.2*cm, 4.4*cm, 1.6*cm, 4, fill=1, stroke=0)
        c.drawImage(logo_path, 2*cm, H-3.2*cm, width=4*cm, preserveAspectRatio=True, mask='auto')
    else:
        c.setFillColor(C_WHITE); c.setFont('Helvetica-Bold', 16)
        c.drawString(2*cm, H-2.5*cm, 'CATALYSTSCAN')
        
    c.setFont('Helvetica', 9); c.setFillColor(C_GOLD)
    c.drawRightString(W-2*cm, H-2.5*cm, 'IT INFRASTRUCTURE HEALTH ASSESSMENT')
    # Title
    c.setFillColor(C_WHITE); c.setFont('Helvetica-Bold', 30)
    c.drawCentredString(W/2, H/2+1.5*cm, title)
    c.setFont('Helvetica', 13); c.setFillColor(HexColor('#a0b4c8'))
    c.drawCentredString(W/2, H/2+0.3*cm, 'Comprehensive Technology Assessment Report')
    # Details box
    c.setFillColor(HexColor('#244b6e')); c.roundRect(W/2-5*cm, H/2-3.5*cm, 10*cm, 2.8*cm, 6, fill=1, stroke=0)
    c.setFillColor(C_WHITE); c.setFont('Helvetica-Bold', 12)
    c.drawCentredString(W/2, H/2-1.5*cm, f'Prepared for: {org}')
    c.setFont('Helvetica', 11); c.setFillColor(C_GOLD)
    c.drawCentredString(W/2, H/2-2.3*cm, f'By: {partner}')
    c.setFillColor(HexColor('#a0b4c8')); c.setFont('Helvetica', 10)
    c.drawCentredString(W/2, H/2-3*cm, datetime.date.today().strftime('%B %d, %Y'))
    # Footer
    c.setFillColor(C_GOLD); c.setFont('Helvetica', 8)
    c.drawCentredString(W/2, 2.5*cm, 'CONFIDENTIAL — For authorized recipients only')
    c.restoreState()

def gen_pdf(org_id, org_name, partner_name, rtype, cost=35000, years=3):
    data = _gather(org_id)
    s = _s()
    buf = io.BytesIO()
    
    titles = {'academic': 'Academic Assessment', 'industry_it': 'IT Technical Report', 'industry_mgmt': 'Management Executive Summary'}
    report_title = titles.get(rtype, 'Health Report')
    
    def first_page(c, doc):
        _cover(c, doc, org_name, partner_name, report_title)
    
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2*cm, bottomMargin=2.2*cm, leftMargin=2*cm, rightMargin=2*cm)
    story = []
    # Blank first page (cover drawn via onFirstPage)
    story.append(Spacer(1, 1))
    story.append(PageBreak())
    
    # ── Page 2: Executive Summary ──
    story.append(Paragraph("Executive Summary", s['Sec']))
    if data['avg_score'] >= 70: verdict = "good health"; vc = C_SUCCESS
    elif data['avg_score'] >= 50: verdict = "moderate condition"; vc = C_WARNING
    else: verdict = "poor condition requiring immediate attention"; vc = C_DANGER
    story.append(Paragraph(
        f"Our comprehensive scan of <b>{data['total']}</b> systems at <b>{org_name}</b> reveals "
        f"an average health score of <b>{data['avg_score']}/100</b>, indicating the infrastructure is in "
        f"<b><font color='{vc.hexval()}'>{verdict}</font></b>. "
        f"Of the total fleet, <b><font color='{C_SUCCESS.hexval()}'>{data['healthy']}</font></b> systems are healthy, "
        f"<b><font color='{C_WARNING.hexval()}'>{data['warning']}</font></b> need planned replacement, and "
        f"<b><font color='{C_DANGER.hexval()}'>{data['critical']}</font></b> require immediate action.",
        s['Body']))
    story.append(Spacer(1, 12))
    
    # KPI Cards (rounded individual shapes)
    cards = Table([[
        _metric_card("Total Systems", str(data['total']), C_PRIMARY),
        _metric_card("Avg Health", f"{data['avg_score']}%", C_WARNING if data['avg_score']<70 else C_SUCCESS),
        _metric_card("Low Risk", str(data['healthy']), C_SUCCESS),
        _metric_card("Med/High Risk", str(data['warning']+data['critical']), C_DANGER),
    ]], colWidths=[115]*4, rowHeights=[55])
    cards.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(cards)
    story.append(Spacer(1, 15))
    
    # Charts — stacked vertically to avoid overflow
    pie = _draw_pie(data['grades'], data['total'])
    bar = _draw_bar(data['devices'])
    story.append(Paragraph("<b>Grade Distribution</b>", s['Sub']))
    story.append(pie)
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Health Score Distribution</b>", s['Sub']))
    story.append(bar)
    story.append(PageBreak())
    
    # ── Page 3: Device Details ──
    story.append(Paragraph("Device Health Overview", s['Sec']))
    story.append(Paragraph("Each system has been scanned and graded A through F based on component health, age, and performance metrics.", s['Body']))
    story.append(Spacer(1, 8))
    
    if rtype == 'industry_it':
        hdr = ['#', 'Hostname', 'Grade', 'Score', 'CPU', 'RAM', 'OS']
        rows = [hdr]
        for i, dev in enumerate(data['devices'][:25], 1):
            rows.append([str(i), dev['hostname'][:18], dev['grade'], str(dev['score']),
                dev['cpu'].get('brand','N/A')[:22], f"{dev['ram'].get('total_gb','?')} GB",
                dev['os'].get('os_name','N/A')[:18]])
        t = Table(rows, colWidths=[22, 80, 35, 35, 110, 42, 90])
    else:
        hdr = ['#', 'Hostname', 'Grade', 'Score', 'Status', 'Est. Lifespan']
        rows = [hdr]
        for i, dev in enumerate(data['devices'][:25], 1):
            h = dev['health'].get('overall',{}) if isinstance(dev['health'],dict) else {}
            st = 'CRITICAL' if dev['grade'] in ('D','F') else ('WARNING' if dev['grade']=='C' else 'OK')
            rows.append([str(i), dev['hostname'][:22], dev['grade'], str(dev['score']), st, h.get('estimated_lifespan','N/A')])
        t = Table(rows, colWidths=[22, 120, 40, 40, 65, 90])
    t.setStyle(_tbl_style())
    story.append(t)
    
    if rtype == 'industry_it':
        story.append(PageBreak())
        story.append(Paragraph("Component-Level Analysis", s['Sec']))
        for dev in data['devices'][:10]:
            comps = dev.get('components', {})
            if not comps: continue
            cr = [['Component', 'Model', 'Grade', 'Score', 'Action']]
            for cn, cd in comps.items():
                if not isinstance(cd, dict): continue
                cr.append([cn.upper(), str(cd.get('name',''))[:28], cd.get('grade','?'),
                          str(cd.get('score',0)), str(cd.get('replacement',{}).get('flag','OK'))])
            if len(cr) > 1:
                story.append(Paragraph(f"<b>{dev['hostname']}</b> — Score: {dev['score']}/100", s['Sub']))
                ct = Table(cr, colWidths=[65, 140, 40, 40, 85])
                ct.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),C_DARK),('TEXTCOLOR',(0,0),(-1,0),C_WHITE),
                    ('FONTSIZE',(0,0),(-1,-1),7),('GRID',(0,0),(-1,-1),0.3,C_BORDER),
                    ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
                story.append(ct)
                story.append(Spacer(1, 6))
    
    story.append(PageBreak())
    
    # ── Recommendations & Action Plan ──
    story.append(Paragraph("Recommended Course of Action", s['Sec']))
    
    crit_devs = [d for d in data['devices'] if d['grade'] in ('D','F')]
    warn_devs = [d for d in data['devices'] if d['grade'] == 'C']
    
    if crit_devs:
        story.append(Paragraph(f"<b><font color='{C_DANGER.hexval()}'>Priority 1 — Immediate Replacement ({len(crit_devs)} systems)</font></b>", s['Body']))
        story.append(Paragraph("These systems have critically degraded components and are at high risk of failure. Continuing to use them poses risks of data loss, productivity impact, and potential safety issues.", s['Body']))
        for d in crit_devs[:8]:
            issues = d['health'].get('overall',{}).get('top_issues',[]) if isinstance(d['health'],dict) else []
            itxt = issues[0] if issues else 'Multiple components degraded'
            story.append(Paragraph(f"&nbsp;&nbsp;• <b>{d['hostname']}</b> (Score: {d['score']}) — {itxt}", s['Small']))
        story.append(Spacer(1, 8))
    
    if warn_devs:
        story.append(Paragraph(f"<b><font color='{C_WARNING.hexval()}'>Priority 2 — Planned Replacement ({len(warn_devs)} systems)</font></b>", s['Body']))
        story.append(Paragraph("These systems show moderate wear. They are functional but should be scheduled for replacement within the next 12 months to prevent unexpected failures.", s['Body']))
        for d in warn_devs[:5]:
            story.append(Paragraph(f"&nbsp;&nbsp;• <b>{d['hostname']}</b> (Score: {d['score']})", s['Small']))
        story.append(Spacer(1, 8))
    
    healthy_devs = [d for d in data['devices'] if d['grade'] in ('A','B')]
    if healthy_devs:
        story.append(Paragraph(f"<b><font color='{C_SUCCESS.hexval()}'>No Action Needed ({len(healthy_devs)} systems)</font></b>", s['Body']))
        story.append(Paragraph("These systems are in good health. Continue regular monitoring.", s['Body']))
        story.append(Spacer(1, 10))
    
    # Phase-wise Implementation Timeline
    story.append(Paragraph("Phase-wise Implementation Plan", s['Sec']))
    timeline = _draw_timeline(len(crit_devs), len(warn_devs), cost, years)
    story.append(timeline)
    story.append(Spacer(1, 10))
    
    # Phase table
    phase_rows = [['Phase', 'Timeline', 'Systems', 'BOM', 'Est. Budget']]
    
    total_sys = len(crit_devs) + len(warn_devs)
    per_yr = math.ceil(total_sys / max(years, 1))
    remaining_c = len(crit_devs)
    remaining_w = len(warn_devs)
    
    for yr in range(years):
        nc = min(per_yr, remaining_c); remaining_c -= nc
        nw = min(per_yr - nc, remaining_w); remaining_w -= nw
        systems = nc + nw
        bom = f"{systems} x Workstation/PC Unit" if systems > 0 else "-"
        phase_rows.append([f"Phase {yr+1}", f"Year {yr+1}", str(systems), bom, f"Rs.{systems*cost:,}"])
        
    total_budget = total_sys * cost
    phase_rows.append(['TOTAL', f"{years} Years", str(total_sys), f"{total_sys} x Units Total", f"Rs.{total_budget:,}"])
    
    pt = Table(phase_rows, colWidths=[50, 60, 50, 170, 80])
    pt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_PRIMARY), ('TEXTCOLOR', (0,0), (-1,0), C_WHITE),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BACKGROUND', (0,-1), (-1,-1), C_PRIMARY_LIGHT),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9), ('GRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(pt)
    story.append(Spacer(1, 15))
    
    # ROI / Best Course of Action — KeepTogether prevents page split
    reco_elements = []
    if data['critical'] > data['total'] * 0.5:
        reco_elements.append(Paragraph(
            f"<b>Recommendation: Phased Fleet Refresh</b><br/>"
            f"With {round(data['critical']/data['total']*100)}% of your fleet at High Risk, "
            f"we recommend a {years}-year phased replacement strategy. This approach spreads the investment "
            f"of <b>Rs.{total_budget:,}</b> across {years} budget cycles while immediately addressing "
            f"the highest-risk systems first. Proactive replacement reduces unplanned downtime by up to 70% "
            f"and avoids emergency procurement costs (typically 20-30% higher than planned purchases).",
            s['Callout']))
    elif data['critical'] > 0:
        reco_elements.append(Paragraph(
            f"<b>Recommendation: Targeted Replacement</b><br/>"
            f"Replace the {data['critical']} High Risk systems immediately (Rs.{data['critical']*cost:,}), "
            f"then schedule {data['warning']} Medium Risk systems for planned replacement over the next {years-1} years. "
            f"This maintains productivity while optimizing budget allocation.",
            s['Callout']))
    else:
        reco_elements.append(Paragraph(
            "<b>Recommendation: Continue Monitoring</b><br/>"
            "Your fleet is in healthy condition. Continue quarterly health scans to track component aging "
            "and plan proactively for future replacements.",
            s['Callout']))
    story.append(KeepTogether(reco_elements))
    
    doc.build(story, onFirstPage=first_page, onLaterPages=_header_footer)
    buf.seek(0)
    return buf

@router.post("/api/reports/generate")
async def generate_report(req: ReportRequest, user=Depends(require_admin)):
    role = user.get("role","")
    if role == "partner":
        pid = user.get("partner_id")
        if not pid: raise HTTPException(403, "No partner linked")
        orgs = db.get_orgs_by_partner(pid)
        if req.org_id not in [o["id"] for o in orgs]:
            raise HTTPException(403, "Access denied")
        p = db.get_partner(pid)
        pname = p.get("name","Partner") if p else "Partner"
    elif role == "super_admin":
        pname = "CatalystScan Admin"
    else:
        raise HTTPException(403, "Reports require partner or admin role")
    if req.report_type not in ('academic','industry_it','industry_mgmt'):
        raise HTTPException(400, "Invalid report type")
    org = db.get_org(req.org_id) if hasattr(db,'get_org') else None
    oname = org.get("name", req.org_id) if org else req.org_id
    cost = req.cost_per_replacement or 35000
    years = req.phase_years or 3
    pdf = gen_pdf(req.org_id, oname, pname, req.report_type, cost, years)
    fn = f"CatalystScan_{req.report_type}_{req.org_id}_{datetime.date.today()}.pdf"
    return StreamingResponse(pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={fn}"})
