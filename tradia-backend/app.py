# tradia-backend/app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
import datetime
import importlib
import logging
import os

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="Tradia MT5 Sync (safe import)")

class SyncRequest(BaseModel):
    login: int = Field(..., description="MT account login (integer)")
    password: str = Field(..., description="MT account password")
    server: str = Field(..., description="Broker server name (string)")
    from_ts: Optional[str] = Field(None, description="ISO date string (inclusive)")
    to_ts: Optional[str] = Field(None, description="ISO date string (inclusive)")

def get_mt5_module():
    """
    Import MetaTrader5 on demand. Raises RuntimeError with clear message if import fails.
    """
    try:
        mt5 = importlib.import_module("MetaTrader5")
        return mt5
    except Exception as e:
        logging.exception("Failed importing MetaTrader5")
        raise RuntimeError(f"Could not import MetaTrader5 Python package: {e}")

def ensure_mt5_initialized(terminal_path: Optional[str] = None) -> Any:
    """
    Initialize MetaTrader5. If terminal_path provided, pass it.
    Returns the mt5 module on success.
    """
    mt5 = get_mt5_module()

    # priority: explicit function arg -> env var -> None
    path = terminal_path or os.environ.get("MT5_TERMINAL_PATH") or None

    try:
        # mt5.initialize accepts a path or None; return True on success
        initialized = mt5.initialize(path) if path else mt5.initialize()
        if not initialized:
            # try one more time without path
            if path and mt5.initialize():
                logging.info("mt5 initialized (retry without path)")
                return mt5
            err = mt5.last_error() if hasattr(mt5, "last_error") else "unknown"
            raise RuntimeError(f"MetaTrader5 initialize failed: {err}")
        logging.info("mt5 initialized")
        return mt5
    except Exception as e:
        logging.exception("ensure_mt5_initialized error")
        raise RuntimeError(f"MetaTrader5 initialization error: {e}")

def namedtuple_to_dict(nt) -> Dict[str, Any]:
    # try _asdict for namedtuple-like objects
    if hasattr(nt, "_asdict"):
        try:
            return dict(nt._asdict())
        except Exception:
            pass
    # fallback: pull public attributes
    out = {}
    for k in dir(nt):
        if k.startswith("_"):
            continue
        try:
            v = getattr(nt, k)
            if callable(v):
                continue
            out[k] = v
        except Exception:
            continue
    return out

@app.post("/sync_mt5")
async def sync_mt5(body: SyncRequest):
    """
    POST /sync_mt5
    Body: { login, password, server, from_ts?, to_ts? }
    Returns: { success: True, account: {...}, trades: [...] }
    """
    try:
        # Import & initialize MT5 at runtime (will raise RuntimeError if import fails)
        mt5 = ensure_mt5_initialized()

        # login uses integer login; password & server often work
        ok = False
        try:
            ok = mt5.login(int(body.login), password=body.password, server=body.server)
        except TypeError:
            # some mt5 builds accept different signature; try best-effort
            ok = mt5.login(int(body.login))
            # then ensure server is set or rely on terminal config
        if not ok:
            err = mt5.last_error() if hasattr(mt5, "last_error") else "login failed"
            raise HTTPException(status_code=400, detail=f"MT5 login failed: {err}")

        # parse date range
        if body.from_ts:
            try:
                dt_from = datetime.datetime.fromisoformat(body.from_ts)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid from_ts ISO date")
        else:
            dt_from = datetime.datetime.now() - datetime.timedelta(days=365)

        if body.to_ts:
            try:
                dt_to = datetime.datetime.fromisoformat(body.to_ts)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid to_ts ISO date")
        else:
            dt_to = datetime.datetime.now()

        logging.info(f"Fetching deals from {dt_from} to {dt_to} for login {body.login} on server {body.server}")

        # fetch deals (closed trades)
        deals = mt5.history_deals_get(dt_from, dt_to)
        trades: List[Dict[str, Any]] = []
        if deals is None:
            logging.info("No deals returned or history_deals_get returned None")
            trades = []
        else:
            for d in deals:
                trades.append(namedtuple_to_dict(d))

        # account info
        account_info = {}
        try:
            ai = mt5.account_info()
            if ai is not None:
                account_info = namedtuple_to_dict(ai)
        except Exception as e:
            logging.warning("Could not fetch account_info: %s", e)

        # cleanup - optionally logout / shutdown to release resources
        try:
            mt5.shutdown()
        except Exception:
            pass

        return {
            "success": True,
            "account": {
                "login": body.login,
                "server": body.server,
                "info": account_info
            },
            "trades": trades,
        }
    except HTTPException as he:
        raise he
    except RuntimeError as re:
        logging.exception("MT5 runtime error")
        # clear message but keep details
        raise HTTPException(status_code=500, detail=str(re))
    except Exception as e:
        logging.exception("MT5 sync error")
        raise HTTPException(status_code=500, detail=str(e))
