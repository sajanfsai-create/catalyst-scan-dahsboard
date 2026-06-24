"""
Bostontech CatalystScan — Central Telemetry Dashboard Server
FastAPI application with modular routers for telemetry, licensing, and fleet management.

Architecture: main.py is a thin orchestrator that:
  1. Creates the FastAPI app
  2. Configures middleware (CORS, rate limiting)
  3. Mounts all feature routers
  4. Serves the static dashboard frontend
"""
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response, FileResponse
from starlette.responses import Response as StarletteResponse

from config import VERSION, ALLOWED_ORIGINS, DASHBOARD_DIR
import database as db
import logging
from logging.handlers import RotatingFileHandler

# Configure structured logging
log_formatter = logging.Formatter(
    '[%(asctime)s] %(levelname)s [%(name)s:%(lineno)d] %(message)s'
)
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
if not os.path.exists(log_dir):
    os.makedirs(log_dir)
log_file = os.path.join(log_dir, "server.log")

file_handler = RotatingFileHandler(log_file, maxBytes=1*1024*1024, backupCount=5)
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
console_handler.setLevel(logging.INFO)

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
if root_logger.hasHandlers():
    root_logger.handlers.clear()
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

logger = logging.getLogger(__name__)
logger.info("Structured logging initialized.")

# ── Rate Limiting ──
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ══════════════════════════════════════════
# APP INITIALIZATION
# ══════════════════════════════════════════

app = FastAPI(title="Bostontech CatalystScan Dashboard", version=VERSION)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════
# MOUNT ROUTERS
# ══════════════════════════════════════════

from routers import auth, telemetry, dashboard, admin, reports, builder, compliance, customer
from routers import notifications as notifications_router
from routers import export as export_router

app.include_router(auth.router)
app.include_router(telemetry.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(reports.router)
app.include_router(builder.router)
app.include_router(compliance.router)
app.include_router(customer.router)
app.include_router(notifications_router.router)
app.include_router(export_router.router)


# ══════════════════════════════════════════
# CORE ROUTES (health check, favicon, root)
# ══════════════════════════════════════════

@app.get("/api/health")
async def health_check():
    """Simple health check for connectivity verification from scanner clients."""
    return {"status": "ok", "version": VERSION, "service": "dashboard"}


@app.get("/favicon.ico")
async def favicon():
    """Serve favicon to prevent 404 in browser console."""
    favicon_path = os.path.join(DASHBOARD_DIR, "favicon.ico")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    return StarletteResponse(content=b'', media_type='image/x-icon', status_code=204)


@app.get("/downloads", response_class=HTMLResponse)
async def downloads_page():
    """Public download page for CatalystScan .exe packages."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CatalystScan — Download Agent</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: #EAF6FB;
            color: #0B1E4D; min-height: 100vh;
            display: flex; flex-direction: column; align-items: center;
        }
        .header { text-align: center; padding: 60px 20px 30px; }
        .header .logo {
            width: 80px; height: 80px;
            background: linear-gradient(135deg, #0B1E4D, #00BFA6);
            border-radius: 20px; display: flex; align-items: center; justify-content: center;
            font-size: 40px; margin: 0 auto 20px;
            box-shadow: 0 8px 32px rgba(11, 30, 77, 0.3);
            overflow: hidden;
        }
        .header .logo img { width: 100%; height: 100%; object-fit: contain; }
        .header h1 { font-size: 2rem; font-weight: 700; color: #0B1E4D; }
        .header p { color: #334155; margin-top: 8px; font-size: 1.05rem; }
        .container { max-width: 800px; width: 100%; padding: 0 20px 60px; }
        .card {
            background: #ffffff; border: 1px solid #d1e9f5;
            border-radius: 16px; padding: 24px; margin-bottom: 16px;
            box-shadow: 0 10px 15px -3px rgba(11, 30, 77, 0.06);
            transition: border-color 0.3s, transform 0.2s;
        }
        .card:hover { border-color: #00BFA6; transform: translateY(-2px); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .card-header h3 { font-size: 1.1rem; color: #0B1E4D; }
        .badge { background: linear-gradient(135deg, #0B1E4D, #00BFA6); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: white; }
        .card-meta { display: flex; gap: 20px; color: #64748b; font-size: 0.85rem; margin-bottom: 16px; }
        .btn-download {
            display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px;
            background: linear-gradient(135deg, #0B1E4D, #00BFA6); color: #fff; border: none;
            border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer;
            text-decoration: none; transition: opacity 0.2s, transform 0.2s;
        }
        .btn-download:hover { opacity: 0.9; transform: scale(1.02); }
        .empty-state { text-align: center; padding: 60px 20px; color: #64748b; }
        .empty-state .icon { font-size: 3rem; margin-bottom: 16px; }
        .instructions {
            background: rgba(0, 191, 166, 0.1); border: 1px solid rgba(0, 191, 166, 0.2);
            border-radius: 12px; padding: 20px; margin-top: 30px;
            color: #334155;
        }
        .instructions h3 { color: #0B1E4D; margin-bottom: 12px; }
        .instructions ol { padding-left: 20px; color: #334155; line-height: 1.9; }
        .instructions code { background: rgba(11, 30, 77, 0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; color: #0B1E4D; }
        #loading { text-align: center; padding: 40px; color: #64748b; }
        .instructions ul { text-align: left; margin: 12px 0 0 20px; font-size: 0.95rem; color: #334155; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo"><img src="/logo.png" alt="Bostontech CatalystScan" onerror="this.onerror=null; this.textContent='⚡';"></div>
        <h1>CatalystScan Agent</h1>
        <p>Download the latest scanning agent for your organization</p>
    </div>
    <div class="container">
        <div id="builds-list"><div id="loading">Loading available packages...</div></div>
        <div class="instructions">
            <h3>Installation Instructions</h3>
            <ol>
                <li>Download the <strong>.zip</strong> package for your organization</li>
                <li>Extract the zip to a permanent folder (e.g. <code>C:\\CatalystScan</code>)</li>
                <li>Double-click <strong>CatalystScan.exe</strong> to run the scanner with UI</li>
                <li>To install as a <strong>background agent</strong> (auto-start on boot):
                    <br>Open CMD as Admin and run: <code>CatalystScan.exe --install</code></li>
            </ol>
        </div>
    </div>
    <div class="footer">Bostontech India Pvt Ltd · CatalystScan v""" + VERSION + """</div>
    <script>
        async function loadBuilds() {
            try {
                const res = await fetch('/api/public/downloads');
                const data = await res.json();
                const container = document.getElementById('builds-list');
                if (!data.builds || data.builds.length === 0) {
                    container.innerHTML = '<div class="empty-state"><div class="icon">📦</div><p>No packages available yet.<br>Contact your administrator.</p></div>';
                    return;
                }
                container.innerHTML = data.builds.map(b => `
                    <div class="card">
                        <div class="card-header"><h3>${b.filename}</h3><span class="badge">v""" + VERSION + """</span></div>
                        <div class="card-meta"><span>${b.size_mb} MB</span><span>${new Date(b.created).toLocaleDateString()}</span></div>
                        <a href="/api/public/download/${b.filename}" class="btn-download" download>Download Package</a>
                    </div>
                `).join('');
            } catch (e) {
                document.getElementById('builds-list').innerHTML = '<div class="empty-state"><div class="icon">❌</div><p>Failed to load packages.</p></div>';
            }
        }
        loadBuilds();
    </script>
</body>
</html>"""


# ══════════════════════════════════════════
# FRONTEND SERVING
# ══════════════════════════════════════════

if not os.path.exists(DASHBOARD_DIR):
    os.makedirs(DASHBOARD_DIR)

class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            response = await super().get_response(path, scope)
            if response.status_code == 404:
                return await super().get_response("index.html", scope)
            return response
        except Exception:
            return await super().get_response("index.html", scope)

app.mount("/dashboard", SPAStaticFiles(directory=DASHBOARD_DIR, html=True), name="dashboard")


@app.get("/", response_class=HTMLResponse)
async def root():
    """Redirect to dashboard."""
    return """<html><head><meta http-equiv="refresh" content="0;url=/dashboard/"></head></html>"""


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Bostontech CatalystScan Dashboard Server...")
    logger.info(f"Dashboard: http://localhost:9000/dashboard/")
    logger.info(f"Downloads: http://localhost:9000/downloads")
    logger.info(f"API Docs:  http://localhost:9000/docs")
    uvicorn.run(app, host="0.0.0.0", port=9000)
