MT5 on Linux via Wine + Xvfb (Headless)

Overview
- Runs the official MetaTrader 5 terminal under Wine inside a headless X server (Xvfb).
- Auto‑logs in using a config file (server, login, investor password).
- Optionally exposes VNC for debugging the GUI.
- Intended to pair with an EA/bridge (e.g., MtApi5 EA) for programmatic access on a TCP port.

Important
- You still need a bridge inside the terminal (an Expert Advisor like MtApi5 EA) to expose a TCP port (e.g., 8228) that your app can talk to. This repo does not ship the EA binary. Place your EA under MQL5/Experts and attach it to a chart (via VNC once) or use a template to autoload it.
- Running MT5 under Wine is brittle and broker updates can break unattended flows. Use at your own risk in production.

Files
- Dockerfile — Ubuntu + Wine + Xvfb image that downloads and runs MT5.
- entrypoint.sh — Boots Xvfb, initializes Wine, writes MT5 config, and launches Terminal64.exe.
- mt5-config.tpl — Template used to inject your broker credentials.

Environment variables
- MT5_SERVER: e.g., Exness-MT5Real
- MT5_LOGIN: numeric login
- MT5_PASSWORD: investor (read‑only) password
- TZ: timezone (default UTC)
- ENABLE_VNC: set to "1" to run x11vnc on :1 (port 5901)
- VNC_PASSWORD: optional password for VNC

Volumes (recommended)
- Persist Wine prefix and MT5 data to survive restarts and store charts/EAs:
  - -v mt5_wine_home:/home/mt5

Ports
- 5901 (optional): VNC when ENABLE_VNC=1
- 8228 (example): If your EA/bridge opens a TCP server for API access (MtApi5 default).

Quick start (Docker CLI)
1) Build: docker build -t tradia/mt5-wine docker/mt5-wine
2) Run:
   docker run -d --name mt5 \
     -e MT5_SERVER=Exness-MT5Real \
     -e MT5_LOGIN=12345678 \
     -e MT5_PASSWORD=InvestorPass \
     -e ENABLE_VNC=1 \
     -e VNC_PASSWORD=changeme \
     -e TZ=UTC \
     -p 5901:5901 \
     -v mt5_wine_home:/home/mt5 \
     tradia/mt5-wine

3) Connect to VNC at localhost:5901 to verify login and attach your EA to a chart.
   - Place your EA file under /home/mt5/MetaTrader/MQL5/Experts (persisted volume) or via VNC.
   - Configure EA inputs to listen on 0.0.0.0:8228 (or suitable port) if supported.

Health / Logs
- Inside the volume at /home/mt5, inspect logs under:
  - /home/mt5/MetaTrader/logs/
  - /home/mt5/MetaTrader/MQL5/Logs/
- Look for authorization success and EA prints.

Compose example (with a .NET mtapi-service talking to EA on 8228)

version: '3.8'
services:
  mt5:
    image: tradia/mt5-wine
    build: ./docker/mt5-wine
    environment:
      - MT5_SERVER=Exness-MT5Real
      - MT5_LOGIN=12345678
      - MT5_PASSWORD=InvestorPass
      - ENABLE_VNC=1
      - VNC_PASSWORD=changeme
    ports:
      - "5901:5901"
      - "8228:8228" # ensure your EA binds to 0.0.0.0 inside MT5
    volumes:
      - mt5_wine_home:/home/mt5

  mtapi-service:
    build: ./mtapi-service
    environment:
      - ASPNETCORE_URLS=http://0.0.0.0:8080
      - MT5_BRIDGE_HOST=mt5
      - MT5_BRIDGE_PORT=8228
    depends_on:
      - mt5
    ports:
      - "8080:8080"

volumes:
  mt5_wine_home: {}

Notes
- Some MT5 installers change paths; this image looks for Terminal64.exe in the standard Program Files location within Wine. If your broker’s installer differs, you may need to mount a pre‑installed MT5 directory under /home/mt5/MetaTrader and update entrypoint paths.
- Auto‑loading an EA can be done by using a terminal template and copying it to the correct profile folder; that is broker‑specific and not automated here.

