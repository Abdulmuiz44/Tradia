import json
import os
import urllib.request
import urllib.error


class TradiaError(Exception):
    pass


class TradiaAuthError(TradiaError):
    pass


class TradiaInsufficientCreditsError(TradiaError):
    pass


class TradiaClient:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or os.environ.get("TALOCODE_API_KEY")
        self.base_url = (base_url or os.environ.get("TALOCODE_BASE_URL", "https://api.talocode.site")).rstrip("/")
        self.use_cloud = bool(self.api_key)

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self.api_key:
            h["Authorization"] = f"Bearer {self.api_key}"
        return h

    def _request(self, method: str, path: str, body: dict | None = None) -> dict:
        url = f"{self.base_url}{path}"
        data = json.dumps(body).encode("utf-8") if body else None
        req = urllib.request.Request(url, data=data, headers=self._headers(), method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            error_map = {
                401: TradiaAuthError,
                402: TradiaInsufficientCreditsError,
            }
            cls = error_map.get(e.code, TradiaError)
            try:
                detail = json.loads(e.read().decode())
                msg = detail.get("error", {}).get("message", str(e))
            except Exception:
                msg = str(e)
            raise cls(msg)

    def health(self) -> dict:
        return self._request("GET", "/v1/tradia/health")

    def agent_plan(self, **kwargs) -> dict:
        return self._request("POST", "/v1/tradia/agent/plan", kwargs)

    def market_analyze(self, **kwargs) -> dict:
        return self._request("POST", "/v1/tradia/market/analyze", kwargs)

    def signal_evaluate(self, **kwargs) -> dict:
        return self._request("POST", "/v1/tradia/signal/evaluate", kwargs)

    def risk_check(self, **kwargs) -> dict:
        return self._request("POST", "/v1/tradia/risk/check", kwargs)

    def trade_propose(self, **kwargs) -> dict:
        return self._request("POST", "/v1/tradia/trade/propose", kwargs)

    def trade_journal(self, **kwargs) -> dict:
        return self._request("POST", "/v1/tradia/trade/journal", kwargs)

    def portfolio_report(self, **kwargs) -> dict:
        return self._request("POST", "/v1/tradia/portfolio/report", kwargs)

    def performance_analyze(self, **kwargs) -> dict:
        return self._request("POST", "/v1/tradia/performance/analyze", kwargs)

    def public_update_generate(self, **kwargs) -> dict:
        return self._request("POST", "/v1/tradia/public-update/generate", kwargs)

    def backtest_simulate(self, **kwargs) -> dict:
        return self._request("POST", "/v1/tradia/backtest/simulate", kwargs)

    def accountability_card(self, **kwargs) -> dict:
        return self._request("POST", "/v1/tradia/accountability/card", kwargs)

    def export_markdown(self, data: dict) -> dict:
        return self._request("POST", "/v1/tradia/export/markdown", data)

    def export_json(self, data: dict) -> dict:
        return self._request("POST", "/v1/tradia/export/json", data)


def create_tradia_client(api_key: str | None = None, base_url: str | None = None) -> TradiaClient:
    return TradiaClient(api_key, base_url)
