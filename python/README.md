# Tradia

Agentic trading intelligence — trade proposals, risk checks, journals, performance reports, and public accountability updates.

```bash
pip install tradia
```

## Usage

```python
from tradia import TradiaClient

client = TradiaClient(api_key="your_talocode_key")
plan = client.agent_plan(symbol="XAUUSD", strategy="trend_continuation")
print(plan["result"]["thesis"])
```

## CLI

```bash
tradia health
tradia propose --data '{"symbol":"XAUUSD","strategy":"trend_continuation","accountBalance":10000,"riskPercent":1,"entry":1950,"stopLoss":1940,"takeProfit":1970}'
```

Requires `TALOCODE_API_KEY` environment variable or pass `--cloud` with `api_key` parameter.
