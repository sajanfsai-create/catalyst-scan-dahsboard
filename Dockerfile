# ── CatalystScan Dashboard — Dockerfile ──
# Single stage: Python backend + vanilla JS/HTML/CSS frontend (no build step needed)

FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY *.py ./
COPY routers/ ./routers/

# Copy dashboard frontend (vanilla HTML/JS/CSS — no build step needed)
COPY dashboard/ ./dashboard/

# Create runtime directories
RUN mkdir -p logs reports uploads generated_builds

# Expose app port
EXPOSE 9000

# Run with Gunicorn + Uvicorn workers
CMD ["gunicorn", "main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "2", \
     "--bind", "0.0.0.0:9000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
