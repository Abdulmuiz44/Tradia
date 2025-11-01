"""
FastAPI MT5 sync service for Tradia AI

Endpoints:
  - POST /connect-mt5: Validate and securely store investor credentials
  - GET  /sync-trades: Pull history and open positions into DB

Security:
  - AES-256-GCM encryption for investor password (env MT5_CRED_KEY)
  - Bcrypt hash stored alongside for integrity checking (no plaintext persistence)
  - CORS restricted by env (defaults to local development)

DB:
  - PostgreSQL via psycopg2-binary (env DATABASE_URL)
  - Schema provided in /db/schema.sql

MT5 Logic:
  - Primary: MetaTrader5 Python API (requires terminal)
  - Fallback: MetaApi.cloud REST if METAAPI_TOKEN is set

Rate limiting:
  - 10 syncs/hour per user_id (in-memory; replace with Redis for prod)
"""
from __future__ import annotations

import base64
import json
import os
import time
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from supabase import create_client, Client
import requests
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import bcrypt

# Try to import MetaTrader5; if unavailable or initialize fails, we’ll fallback.
try:
    import MetaTrader5 as mt5
except Exception:  # pragma: no cover
    mt5 = None  # type: ignore


# ------------------
# Config and helpers
# ------------------

load_dotenv()
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
MT5_CRED_KEY = os.getenv("MT5_CRED_KEY", None)
if not MT5_CRED_KEY:
    # For demo/dev only. In production, set MT5_CRED_KEY to a 32-byte key in base64.
    # Generate via: python -c "import os,base64;print(base64.b64encode(os.urandom(32)).decode())"
    MT5_CRED_KEY = base64.b64encode(os.urandom(32)).decode()

METAAPI_TOKEN = os.getenv("METAAPI_TOKEN", None)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

SYNC_LIMIT_FREE_TIER = 10  # per hour


# Supabase client is initialized globally


def ensure_tables():
    # Tables are assumed to be created in Supabase
    pass


def aes_encrypt(plaintext: str) -> Dict[str, bytes]:
    key = base64.b64decode(MT5_CRED_KEY)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return {"nonce": nonce, "ciphertext": ciphertext}


def aes_decrypt(nonce: bytes, ciphertext: bytes) -> str:
    key = base64.b64decode(MT5_CRED_KEY)
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()


# ------------------
# Rate limiter (in-memory)
# ------------------

_rate_lock = Lock()
_rate_state: Dict[str, List[float]] = {}


def rate_limited(user_id: str, limit: int = SYNC_LIMIT_FREE_TIER) -> bool:
    now = time.time()
    window = 3600.0
    with _rate_lock:
        arr = _rate_state.get(user_id, [])
        arr = [t for t in arr if now - t <= window]
        allowed = len(arr) < limit
        if allowed:
            arr.append(now)
            _rate_state[user_id] = arr
        return allowed


# ------------------
# Pydantic models
# ------------------


class ConnectMT5Request(BaseModel):
    user_id: str = Field(..., description="Internal user identifier")
    server: str = Field(..., description="MT5 server name, e.g., Exness-MT5Real")
    login: int = Field(..., description="MT5 login number")
    investor_password: str = Field(..., min_length=4)


class ConnectMT5Response(BaseModel):
    ok: bool
    account_id: Optional[int] = None
    message: Optional[str] = None


class TradeModel(BaseModel):
    id: int
    symbol: str
    type: str
    volume: float
    open_time: str
    close_time: Optional[str] = None
    profit: float
    comment: Optional[str] = None
    raw: Dict[str, Any]

class UpsertTradesRequest(BaseModel):
    user_id: str
    login: Optional[int] = None
    trades: List[TradeModel]

class UpsertTradesResponse(BaseModel):
    ok: bool
    imported: int
    message: Optional[str] = None


# ------------------
# MT5 helpers
# ------------------


def try_mt5_login(server: str, login: int, password: str) -> bool:
    if mt5 is None:
        return False
    try:
        if not mt5.initialize():
            return False
        if not mt5.login(login=login, password=password, server=server):
            return False
        info = mt5.account_info()
        return bool(info)
    except Exception:
        return False
    finally:
        try:
            mt5.shutdown()
        except Exception:
            pass


def mt5_pull_history_and_positions(server: str, login: int, password: str, since: Optional[datetime]) -> Dict[str, Any]:
    result: Dict[str, Any] = {"trades": [], "positions": []}
    if mt5 is None:
        return result
    try:
        if not mt5.initialize():
            return result
        if not mt5.login(login=login, password=password, server=server):
            return result

        utc = timezone.utc
        fr = since or (datetime.now(utc) - timedelta(days=90))
        to = datetime.now(utc)
        deals = mt5.history_deals_get(fr, to) or []
        positions = mt5.positions_get() or []

        # Map deals to a generic schema compatible with Tradia
        trades = []
        for d in deals:
            try:
                trades.append(
                    {
                        "id": int(d.ticket),
                        "symbol": str(d.symbol),
                        "type": str(d.type),
                        "volume": float(d.volume),
                        "open_time": datetime.fromtimestamp(int(d.time), timezone.utc).isoformat(),
                        "close_time": datetime.fromtimestamp(int(d.time_msc) // 1000, timezone.utc).isoformat() if getattr(d, "time_msc", 0) else None,
                        "profit": float(d.profit),
                        "comment": str(getattr(d, "comment", "")),
                        "raw": {k: getattr(d, k) for k in dir(d) if not k.startswith("_")},
                    }
                )
            except Exception:
                continue

        open_positions = []
        for p in positions:
            try:
                open_positions.append(
                    {
                        "id": int(p.ticket),
                        "symbol": str(p.symbol),
                        "type": str(p.type),
                        "volume": float(p.volume),
                        "open_time": datetime.fromtimestamp(int(p.time), timezone.utc).isoformat(),
                        "profit": float(getattr(p, "profit", 0.0)),
                        "comment": str(getattr(p, "comment", "")),
                        "raw": {k: getattr(p, k) for k in dir(p) if not k.startswith("_")},
                    }
                )
            except Exception:
                continue

        result["trades"] = trades
        result["positions"] = open_positions
        return result
    except Exception:
        return result
    finally:
        try:
            mt5.shutdown()
        except Exception:
            pass


def metaapi_pull_history(server: str, login: int, password: str, since: Optional[datetime]) -> Dict[str, Any]:
    """Basic MetaApi REST fallback (requires METAAPI_TOKEN). This is a placeholder; for
    production use the official SDK and WebSocket streaming for real-time updates.
    """
    if not METAAPI_TOKEN:
        return {"trades": [], "positions": []}
    # This is a stub illustrating the shape; MetaApi requires provisioning an account first.
    # We return empty but keep shape consistent.
    return {"trades": [], "positions": []}


def ai_stub_analysis(trades: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Simple placeholder for patterns/insights
    wins = sum(1 for t in trades if float(t.get("profit", 0)) > 0)
    losses = sum(1 for t in trades if float(t.get("profit", 0)) < 0)
    total = len(trades)
    win_rate = (wins / total * 100.0) if total else 0.0
    return {"win_rate": round(win_rate, 2), "total_trades": total}


# ------------------
# FastAPI app
# ------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_tables()
    yield

app = FastAPI(title="Tradia MT5 Sync", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/connect-mt5", response_model=ConnectMT5Response)
def connect_mt5(req: ConnectMT5Request):
    # Validate creds via MT5 or MetaApi fallback
    ok = try_mt5_login(req.server, req.login, req.investor_password)
    if not ok:
        # We don't try MetaApi login here (provisioning is required). Return error for re-entry.
        raise HTTPException(status_code=400, detail="Invalid MT5 credentials or MT5 not available. Re-enter details.")

    enc = aes_encrypt(req.investor_password)
    pwd_hash = bcrypt.hashpw(req.investor_password.encode(), bcrypt.gensalt()).decode()

    result = supabase.table('mt5_accounts').insert({
    'user_id': req.user_id,
    'server': req.server,
    'login': req.login,
    'password_enc': enc['ciphertext'],
    'password_nonce': enc['nonce'],
    'password_hash': pwd_hash
    }).execute()
    account_id = result.data[0]['id']

    return ConnectMT5Response(ok=True, account_id=account_id, message="Connected and credentials stored securely.")


def upsert_trades(user_id: str, login: int, trades: List[Dict[str, Any]]):
    if not trades:
        return 0
    trades_data = []
    for t in trades:
        raw_data = t.get("raw", {})

        # Extract all fields from raw data to populate individual columns
        trade_data = {
            'user_id': user_id,
            'account_login': login,
            'symbol': raw_data.get("symbol", t.get("symbol")),
            'direction': raw_data.get("direction"),
            'ordertype': raw_data.get("orderType"),
            'opentime': raw_data.get("openTime", t.get("open_time")),
            'closetime': raw_data.get("closeTime", t.get("close_time")),
            'session': raw_data.get("session"),
            'lotsize': raw_data.get("lotSize", t.get("volume")),
            'entryprice': raw_data.get("entryPrice"),
            'exitprice': raw_data.get("exitPrice"),
            'stoplossprice': raw_data.get("stopLossPrice"),
            'takeprofitprice': raw_data.get("takeProfitPrice"),
            'pnl': raw_data.get("pnl", t.get("profit")),
            'profitloss': raw_data.get("profitLoss"),
            'resultrr': raw_data.get("resultRR"),
            'rr': raw_data.get("rr"),
            'outcome': raw_data.get("outcome"),
            'duration': raw_data.get("duration"),
            'reasonfortrade': raw_data.get("reasonForTrade"),
            'emotion': raw_data.get("emotion"),
            'journalnotes': raw_data.get("journalNotes"),
            'notes': raw_data.get("notes"),
            'strategy': raw_data.get("strategy"),
            'beforescreenshoturl': raw_data.get("beforeScreenshotUrl"),
            'afterscreenshoturl': raw_data.get("afterScreenshotUrl"),
            'commission': raw_data.get("commission"),
            'swap': raw_data.get("swap"),
            'pinned': raw_data.get("pinned"),
            'tags': raw_data.get("tags"),
            'reviewed': raw_data.get("reviewed"),
            'raw': raw_data,  # Also store complete raw data for backward compatibility
            }

        # Only include ID if it exists and is a valid UUID (for updates)
        trade_id = t.get("id")
        if trade_id and isinstance(trade_id, str) and len(trade_id) == 36:
            # Basic UUID format check
            import re
            if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', trade_id, re.IGNORECASE):
                trade_data['id'] = trade_id

        trades_data.append(trade_data)
    result = supabase.table('trades').upsert(trades_data).execute()
    return len(result.data)


@app.get("/sync-trades", response_model=UpsertTradesResponse)
def sync_trades(user_id: str = Query(...), login: Optional[int] = Query(None)):
    if not rate_limited(user_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

    # Load account
    query = supabase.table('mt5_accounts').select('*').eq('user_id', user_id)
    if login is not None:
        query = query.eq('login', login)
    result = query.order('id', desc=True).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No MT5 account found for user.")
    acc = result.data[0]
    server = acc["server"]
    login_num = int(acc["login"])  # type: ignore
    nonce = bytes(acc["password_nonce"])  # type: ignore
    ciphertext = bytes(acc["password_enc"])  # type: ignore
    last_sync: Optional[datetime] = acc.get("last_sync")

    try:
        password = aes_decrypt(nonce, ciphertext)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt credentials.")

    print(f"[sync] user={user_id} login={login_num} start last_sync={last_sync}")
    data = mt5_pull_history_and_positions(server, login_num, password, last_sync)
    print(f"[sync] MT5 pull history and positions returned: {len(data.get("trades", []))} trades and {len(data.get("positions", []))} positions.")
    if not data["trades"] and METAAPI_TOKEN:
        # Attempt fallback to MetaApi
        data = metaapi_pull_history(server, login_num, password, last_sync)
        print(f"[sync] MetaAPI fallback returned: {len(data.get("trades", []))} trades and {len(data.get("positions", []))} positions.")

    imported = upsert_trades(user_id, login_num, data.get("trades", []))
    print(f"[sync] upsert_trades imported {imported} trades.")

    # Update last_sync
    supabase.table('mt5_accounts').update({'last_sync': 'now()'}).eq('id', acc['id']).execute()

    # Optional: simple AI analysis placeholder on the pulled batch
    analysis = ai_stub_analysis(data.get("trades", []))
    msg = f"Imported {imported} trades. Win rate: {analysis['win_rate']}% of {analysis['total_trades']} trades."
    print(f"[sync] user={user_id} login={login_num} imported={imported}")
    return UpsertTradesResponse(ok=True, imported=imported, message=msg)


@app.get("/api/predict")
def predict_for_user(user_id: str = Query(...), pair: str = Query(...)):
    # Fetch user's plan from the database
    result = supabase.table('users').select('plan').eq('id', user_id).execute()
    user_row = result.data
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
    
    plan = user_row[0]["plan"]

    # Call the tradia-backend service
    try:
        forecaster_url = os.getenv("FORECASTER_URL", "http://localhost:8001")
        forecaster_api_key = os.getenv("FORECASTER_API_KEY", "changeme")
        
        response = requests.get(
            f"{forecaster_url}/api/forecast/{pair}",
            params={"plan": plan},
            headers={"X-API-Key": forecaster_api_key}
        )
        response.raise_for_status()  # Raise an exception for bad status codes
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prediction: {e}")


@app.post("/upsert-trades", response_model=UpsertTradesResponse)
def upsert_trades_endpoint(req: UpsertTradesRequest):
    imported = upsert_trades(req.user_id, req.login, [t.model_dump() for t in req.trades])
    return UpsertTradesResponse(ok=True, imported=imported, message=f"Upserted {imported} trades.")


@app.get("/")
def root():
    return {"ok": True, "service": "Tradia MT5 Sync", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=bool(os.getenv("RELOAD", "1") == "1"),
    )
