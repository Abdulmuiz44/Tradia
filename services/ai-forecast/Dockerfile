FROM node:20-alpine
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev

# Copy source
COPY . .

# Environment
ENV NODE_ENV=production
# Python forecast service URL should be set in Railway envs, e.g.
# FORECAST_SERVICE_URL=http://<python-service>.railway.internal:5000/predict
ENV PORT=4001
EXPOSE 4001

CMD ["node", "server.js"]

