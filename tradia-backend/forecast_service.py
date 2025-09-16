from __future__ import annotations

import os
from datetime import datetime, timedelta
from flask import Flask, request, jsonify

app = Flask(__name__)

try:
    import yfinance as yf  # type: ignore
except Exception:
    yf = None  # fallback to mock

try:
    from prophet import Prophet  # type: ignore
    import pandas as pd  # type: ignore
except Exception:
    Prophet = None
    import pandas as pd  # type: ignore


def load_ohlcv(symbol: str) -> 'pd.DataFrame':
    if yf is None:
        # Mock 120 days of prices
        base = 30000.0
        dates = pd.date_range(end=datetime.utcnow(), periods=120)
        vals = [base]
        import random
        for _ in range(119):
            vals.append(vals[-1] * (1 + random.uniform(-0.02, 0.02)))
        return pd.DataFrame({'Date': dates, 'Close': vals})
    try:
        # Map common crypto tickers to Yahoo
        ticker = symbol
        if symbol.upper() == 'BTCUSD':
            ticker = 'BTC-USD'
        elif symbol.upper() == 'ETHUSD':
            ticker = 'ETH-USD'
        data = yf.download(ticker, period='6mo', interval='1d', progress=False)
        data = data.reset_index().rename(columns={'Date': 'Date', 'Close': 'Close'})
        return data[['Date', 'Close']].dropna()
    except Exception:
        # Fallback mock
        base = 30000.0
        dates = pd.date_range(end=datetime.utcnow(), periods=120)
        vals = [base]
        import random
        for _ in range(119):
            vals.append(vals[-1] * (1 + random.uniform(-0.02, 0.02)))
        return pd.DataFrame({'Date': dates, 'Close': vals})


def forecast_next_day(df: 'pd.DataFrame'):
    # Try Prophet, fallback to simple EMA projection
    try:
        if Prophet is not None:
            model_df = df.rename(columns={'Date': 'ds', 'Close': 'y'})
            m = Prophet(daily_seasonality=True, weekly_seasonality=True)
            m.fit(model_df)
            future = m.make_future_dataframe(periods=1)
            fc = m.predict(future).tail(1).iloc[0]
            yhat = float(fc['yhat'])
            low = float(fc['yhat_lower'])
            high = float(fc['yhat_upper'])
            return yhat, (low, high)
    except Exception:
        pass

    # Fallback: EMA + simple confidence band
    closes = df['Close'].astype(float).tolist()
    if not closes:
        return 0.0, (0.0, 0.0)
    ema = 0.0
    alpha = 2 / (min(20, len(closes)) + 1)
    for c in closes:
        ema = alpha * c + (1 - alpha) * ema
    # naive next-day assumes drift towards EMA
    last = closes[-1]
    predicted = (ema * 0.6) + (last * 0.4)
    band = max(50.0, abs(predicted) * 0.02)
    return float(predicted), (float(predicted - band), float(predicted + band))


@app.get('/predict')
def predict():
    symbol = (request.args.get('symbol') or 'BTCUSD').upper()
    user_id = request.args.get('userId') or 'unknown'

    df = load_ohlcv(symbol)
    yhat, (low, high) = forecast_next_day(df)

    # Personalization mock
    insight = ''
    if user_id == '123':
        insight = "You've traded BTC 12x this month — high conviction signal."
    elif symbol.startswith('BTC'):
        insight = 'Bitcoin shows typical weekly seasonality; watch volatility spikes.'
    else:
        insight = f'{symbol} forecast derived from recent momentum and mean reversion.'

    return jsonify({
        'predicted_price': round(yhat, 2),
        'confidence_interval': [round(low, 2), round(high, 2)],
        'symbol': symbol,
        'insight': insight,
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5000'))
    app.run(host='0.0.0.0', port=port)

