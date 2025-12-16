Railway Deployment Guide (Backends)

Overview
- This repo contains 3 backend services suitable for Railway:
  1) AI Forecast API (Node/Express): services/ai-forecast
  2) Forecast Microservice (Python/Flask): tradia-backend/forecast_service.py
  3) MT5 API (.NET): mtapi-service

Each service has a Dockerfile for production deployment.

Prerequisites
- Railway account: https://railway.app
- Railway CLI: npm i -g @railway/cli
- Optional: Redis instance if you want Redis-backed rate limiting

Services
1) AI Forecast API (Node)
   Path: services/ai-forecast
   Port: PORT (default 4001)
   Env:
   - FORECAST_SERVICE_URL: URL to the Python microservice predict endpoint.
     Example internal (Railway service discovery): http://<python-service-name>.railway.internal:5000/predict
     Or external: https://<python-public-domain>/predict
   - REDIS_URL (optional): if set, enables Redis rate limit store

2) Forecast Microservice (Python)
   Path: tradia-backend (Dockerfile runs forecast_service.py)
   Port: PORT (default 5000)
   Notes: Attempts to use Prophet; gracefully falls back to EMA if Prophet is unavailable.

3) MT5 API (.NET)
   Path: mtapi-service
   Port: Provided by Railway via PORT (container binds to 0.0.0.0:${PORT})

Deploy Steps
1) Create a Railway project (via dashboard or CLI):
   - railway init

2) Add the Python microservice:
   - railway up
   - Choose tradia-backend directory when prompted or set via: railway up -d tradia-backend
   - Set service name, e.g., forecast-python

3) Add the Node AI Forecast API:
   - railway up -d services/ai-forecast
   - Set service name, e.g., forecast-api
   - In service variables, set FORECAST_SERVICE_URL to the Python service endpoint, e.g.,
     http://forecast-python.railway.internal:5000/predict
   - (Optional) Add REDIS_URL and attach a Redis plugin/instance

4) Add the .NET MT5 API:
   - railway up -d mtapi-service
   - Set service name, e.g., mtapi-service

5) Verify health
   - Python: GET /predict?symbol=BTCUSD&userId=123
   - Node: GET /api/forecast/123?symbol=BTCUSD
   - .NET: Verify its documented endpoints respond

Frontend Integration
- The AI Forecast widget in Trade Analytics calls the Node API at AIForecastWidget.jsx using apiBase prop (defaults to http://localhost:4001).
- For production, set a public env in Next.js: NEXT_PUBLIC_FORECAST_API_BASE and pass it to the widget, or update the component default.

Tips
- Logs: Use Railway logs per service to view Winston/Flask/.NET logs.
- Scaling: Adjust CPU/RAM in Railway per service. The Prophet install is heavy; consider keeping EMA fallback in production for speed.
- Security: Add authentication to /api/forecast/:userId and restrict origins via a reverse proxy or app-level CORS.

