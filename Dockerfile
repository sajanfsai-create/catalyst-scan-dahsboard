# ── CatalystScan Dashboard — Dockerfile ──
# Multi-stage: build React frontend, then package with FastAPI backend

# ───────────────────────────────────────
# Stage 1: Build React frontend
# ───────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/dashboard

COPY dashboard/package*.json ./
RUN npm ci --silent

COPY dashboard/ ./
RUN npm run build

# ───────────────────────────────────────
# Stage 2: Python backend + built frontend
# ───────────────────────────────────────
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

# Copy built frontend from Stage 1
# The React build output goes into dashboard/dist → we serve it as 'dashboard/'
COPY --from=frontend-builder /app/dashboard/dist ./dashboard/

# Create runtime directories
RUN mkdir -p logs reports uploads generated_builds

# Expose app port
EXPOSE 9000

# Run with Gunicorn (production) or Uvicorn (dev override)
CMD ["gunicorn", "main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "2", \
     "--bind", "0.0.0.0:9000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
