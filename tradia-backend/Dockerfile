FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for scientific libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install requirements if present (best effort)
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt || true

# Minimal deps for the microservice
RUN pip install --no-cache-dir flask pandas yfinance prophet || \
    (pip install --no-cache-dir flask pandas yfinance && echo "Prophet unavailable, falling back to EMA")

COPY forecast_service.py ./forecast_service.py

ENV PORT=5000
EXPOSE 5000

CMD ["python", "forecast_service.py"]
