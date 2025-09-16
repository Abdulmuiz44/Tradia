// services/ai-forecast/server.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import morgan from 'morgan';
import winston from 'winston';
import { isEligible, getUser } from './eligibilityService.js';

dotenv.config();

const app = express();
app.use(express.json());

// Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// HTTP request logging (concise)
app.use(morgan('tiny'));

// Optional Redis rate-limit store
let store;
let redis;
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL);
    store = new RedisStore({
      sendCommand: (...args) => redis.call(...args)
    });
    logger.info({ msg: 'Rate limiter using Redis store' });
  } catch (e) {
    logger.warn({ msg: 'Redis unavailable, falling back to MemoryStore', error: String(e) });
  }
}

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per key
  keyGenerator: (req) => `${req.params.userId || 'anon'}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMITED', message: 'Too many requests. Try again soon.' },
  store,
});

// Apply limiter to forecast API
app.use('/api/forecast/:userId', limiter);

app.get('/api/forecast/:userId', async (req, res) => {
  const start = Date.now();
  const { userId } = req.params;
  const symbol = String(req.query.symbol || 'BTCUSD');
  const pyUrl = process.env.FORECAST_SERVICE_URL || 'http://localhost:5000/predict';

  try {
    const eligible = await isEligible(userId);
    if (!eligible) {
      const ms = Date.now() - start;
      logger.info({ userId, status: 403, responseTimeMs: ms, eligible });
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Upgrade to premium for AI forecasts.' });
    }

    // Forward to Python microservice
    const url = `${pyUrl}?symbol=${encodeURIComponent(symbol)}&userId=${encodeURIComponent(userId)}`;
    const pyResp = await axios.get(url, { timeout: 10_000 });
    const data = pyResp.data || {};

    const forecast = Number(data.predicted_price ?? data.forecast);
    const ci = Array.isArray(data.confidence_interval) ? data.confidence_interval : [null, null];
    const low = Number(ci[0]);
    const high = Number(ci[1]);
    const conf = Number.isFinite(low) && Number.isFinite(high) && Number.isFinite(forecast)
      ? Math.max(0, Math.min(1, 1 - (Math.abs(high - low) / Math.max(1, Math.abs(forecast)))))
      : 0.7; // heuristic fallback

    const user = getUser(userId);
    const personalized = data.insight || (user?.preferences?.favoriteSymbols?.includes(symbol)
      ? `This aligns with your focus on ${symbol}.`
      : `Consider position sizing per your plan for ${symbol}.`);

    const response = {
      forecast,
      confidence: Number(conf.toFixed(2)),
      symbol,
      timestamp: new Date().toISOString(),
      personalizedInsight: String(personalized || 'No additional insight.')
    };

    const ms = Date.now() - start;
    logger.info({ userId, status: 200, responseTimeMs: ms, symbol });
    return res.json(response);
  } catch (err) {
    const ms = Date.now() - start;
    logger.error({ userId, status: 500, responseTimeMs: ms, error: String(err?.message || err) });
    return res.status(500).json({ error: 'FORECAST_ERROR', message: 'Unable to generate forecast right now.' });
  }
});

const port = process.env.PORT || 4001;
app.listen(port, () => {
  logger.info({ msg: `AI Forecast API listening on :${port}` });
});

