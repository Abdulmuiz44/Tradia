# Adapter Spec — Market Data

## Why this adapter exists
Forex-agent needs normalized pair context (recent price structure, volatility cues, session behavior) regardless of provider format.

## Data source
Planned connection to internal market data service or approved external FX feed used elsewhere in Tradia.

## Expected inputs
- `pairSymbol` (e.g., EURUSD)
- `timeframes` (array: H4/H1/M15)
- `lookbackWindow` (candles or time range)
- optional `sessionContext`

## Expected outputs
- normalized OHLC summary blocks by timeframe
- derived levels candidates (swing highs/lows)
- volatility markers (ATR-like proxy or range percentile)
- freshness metadata (source timestamp, lag)

## Implementation concerns
- provider outages and partial responses
- timeframe synchronization consistency
- timezone normalization (UTC internal)
- cache strategy for repeated pair/timeframe requests
- strict schema validation before AI consumption
