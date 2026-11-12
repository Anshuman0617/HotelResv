# syntax=docker/dockerfile:1
# Build from the repo root:  docker build -f backend/Dockerfile .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=10

WORKDIR /app/backend

# Install dependencies first so code changes don't invalidate this layer.
# The cache mount keeps downloaded wheels between builds, so a retry after a
# network failure doesn't start from zero.
COPY backend/requirements.txt ./requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Backend code plus the shared database/ folder (seed.py, seed.sql)
COPY backend/ /app/backend/
COPY database/ /app/database/

RUN chmod +x docker-entrypoint.sh \
    && useradd --create-home --uid 1000 app \
    && chown -R app:app /app
USER app

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
