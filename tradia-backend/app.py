# tradia-backend/app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any, Dict
import datetime
import importlib
import logging
import os
import re

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="Tradia MT5 Sync (safe import)", version="2.0.0")

class SyncRequest(BaseModel):
    login: int = Field(..., description="MT account login (integer)", ge=10000, le=999999999)
    password: str = Field(..., description="MT account password", min_length=4)
    server: str = Field(..., description="Broker server name (string)", min_length=3)
    from_ts: Optional[str] = Field(None, description="ISO date string (inclusive)")
    to_ts: Optional[str] = Field(None, description="ISO date string (inclusive)")

    @field_validator('server')
    @classmethod
    def validate_server(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+(-MT5|-Live|Live|MT5)?$', v):
            raise ValueError('Invalid server format. Expected format: BrokerName-MT5 or BrokerName-Live')
        return v

    @field_validator('from_ts', 'to_ts')
    @classmethod
    def validate_date(cls, v):
        if v is not None:
            try:
                datetime.datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('Invalid ISO date format')
        return v

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

def validate_mt5_requirements() -> Dict[str, Any]:
    """Check if MT5 environment is properly configured"""
    requirements = {
        "mt5_installed": False,
        "mt5_running": False,
        "api_accessible": False,
        "network_connection": True,  # Assume true, will be checked by connection
        "errors": [],
        "warnings": []
    }

    try:
        mt5 = get_mt5_module()
        requirements["mt5_installed"] = True

        # Try to initialize MT5
        if mt5.initialize():
            requirements["mt5_running"] = True
            requirements["api_accessible"] = True
            mt5.shutdown()  # Clean up
        else:
            requirements["errors"].append("MT5 terminal not running or not accessible")

    except RuntimeError as e:
        requirements["errors"].append(f"MT5 not available: {str(e)}")
    except Exception as e:
        requirements["errors"].append(f"Unexpected error: {str(e)}")

    return requirements

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "version": "2.0.0"
    }

@app.get("/requirements")
async def check_requirements():
    """Check MT5 environment requirements"""
    try:
        requirements = validate_mt5_requirements()
        return {
            "success": True,
            "requirements": requirements,
            "timestamp": datetime.datetime.now().isoformat()
        }
    except Exception as e:
        logging.exception("Requirements check error")
        return {
            "success": False,
            "error": str(e),
            "requirements": None
        }

class ValidateRequest(BaseModel):
    login: int = Field(..., description="MT account login (integer)")
    password: str = Field(..., description="MT account password")
    server: str = Field(..., description="Broker server name (string)")

@app.post("/validate_mt5")
async def validate_mt5(body: ValidateRequest):
    """
    POST /validate_mt5
    Body: { login, password, server }
    Returns: { success: True, account_info: {...} } or error details
    """
    try:
        # Import & initialize MT5 at runtime (will raise RuntimeError if import fails)
        mt5 = ensure_mt5_initialized()

        # Attempt login with timeout
        ok = False
        login_error = None

        try:
            ok = mt5.login(int(body.login), password=body.password, server=body.server)
        except TypeError as te:
            # Some MT5 builds accept different signature; try best-effort
            try:
                ok = mt5.login(int(body.login))
            except Exception as e2:
                login_error = f"Login signature error: {e2}"
        except Exception as le:
            login_error = str(le)

        if not ok:
            # Get detailed error information
            mt5_error = mt5.last_error() if hasattr(mt5, "last_error") else None
            error_msg = login_error or (mt5_error if mt5_error else "Login failed")

            # Categorize the error
            if "wrong password" in error_msg.lower() or "invalid password" in error_msg.lower():
                error_type = "INVALID_CREDENTIALS"
            elif "server" in error_msg.lower() or "connection" in error_msg.lower():
                error_type = "SERVER_UNREACHABLE"
            elif "terminal" in error_msg.lower() or "not found" in error_msg.lower():
                error_type = "TERMINAL_NOT_FOUND"
            else:
                error_type = "LOGIN_FAILED"

            # Cleanup before returning error
            try:
                mt5.shutdown()
            except Exception:
                pass

            raise HTTPException(
                status_code=400,
                detail={
                    "error": error_type,
                    "message": error_msg,
                    "details": {
                        "login": body.login,
                        "server": body.server,
                        "mt5_error": mt5_error
                    }
                }
            )

        # Login successful, get account info
        account_info = {}
        try:
            ai = mt5.account_info()
            if ai is not None:
                account_info = namedtuple_to_dict(ai)
                logging.info(f"Account info retrieved for login {body.login}: balance={account_info.get('balance', 'N/A')}")
            else:
                logging.warning(f"No account info available for login {body.login}")
        except Exception as e:
            logging.warning("Could not fetch account_info: %s", e)
            # Don't fail validation if we can't get account info, just log it

        # Cleanup - logout to free resources
        try:
            mt5.shutdown()
        except Exception:
            pass

        return {
            "success": True,
            "account_info": account_info,
            "message": "MT5 connection validated successfully"
        }

    except HTTPException as he:
        raise he
    except RuntimeError as re:
        logging.exception("MT5 runtime error during validation")
        error_type = "TERMINAL_NOT_FOUND" if "import" in str(re).lower() else "UNKNOWN_ERROR"
        raise HTTPException(
            status_code=500,
            detail={
                "error": error_type,
                "message": str(re),
                "details": {"stage": "initialization"}
            }
        )
    except Exception as e:
        logging.exception("MT5 validation error")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "UNKNOWN_ERROR",
                "message": str(e),
                "details": {"stage": "validation"}
            }
        )

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
