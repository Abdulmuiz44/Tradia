Oracle Cloud Free Tier MT5 Bridge (Ubuntu + Wine) — Setup Guide

Overview
- Goal: Run the Tradia MT5 bridge (FastAPI) 24/7 on an always‑free Oracle VM using Ubuntu, Wine (for MT5 terminal), and Cloudflare Tunnel to expose https://mt5.your-domain.
- You will: provision VM, install Wine + MT5 terminal, Python deps, run FastAPI under systemd, and create a named Cloudflare Tunnel that maps to your subdomain.

1) Provision the VM (Oracle Cloud Free Tier)
- Shape: Ampere A1 (ARM) or AMD/Intel (x86). For Wine, choose x86_64 (AMD) for fewer surprises.
- OS: Ubuntu 22.04 LTS.
- Ingress: open outbound traffic; no inbound needed (Cloudflare Tunnel creates an outbound tunnel).

2) Update and install base packages
```bash
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y software-properties-common curl unzip git python3 python3-pip python3-venv xvfb screen ca-certificates
```

3) Install Wine + Winetricks (for MT5)
```bash
sudo dpkg --add-architecture i386
sudo mkdir -pm755 /etc/apt/keyrings
wget -qO- https://dl.winehq.org/wine-builds/winehq.key | sudo tee /etc/apt/keyrings/winehq-archive.key >/dev/null
wget -qO /etc/apt/sources.list.d/winehq-jammy.sources https://dl.winehq.org/wine-builds/ubuntu/dists/jammy/winehq-jammy.sources
sudo apt-get update -y
sudo apt-get install -y --install-recommends winehq-stable winetricks
```

4) Create a dedicated Wine prefix for MT5
```bash
sudo useradd -m -s /bin/bash mt5
sudo mkdir -p /opt/mt5
sudo chown -R mt5:mt5 /opt/mt5
sudo -u mt5 bash -lc 'export WINEPREFIX=/opt/mt5/wine; mkdir -p "$WINEPREFIX"; WINEDEBUG=-all wineboot -i'
```

5) Install MetaTrader 5 terminal under Wine
- Upload an MT5 installer to the server (or fetch from a broker). Example:
```bash
sudo -u mt5 bash -lc 'cd /opt/mt5 && curl -L -o mt5setup.exe "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"'
sudo -u mt5 bash -lc 'export WINEPREFIX=/opt/mt5/wine; xvfb-run -a wine /opt/mt5/mt5setup.exe /silent'
```
- Typical install path ends up around: `/opt/mt5/wine/drive_c/Program Files/MetaTrader 5/terminal64.exe`

6) Python environment + dependencies
```bash
cd /opt && sudo git clone /root/Tradia Tradia || true
cd /opt/Tradia
sudo python3 -m venv .venv
sudo chown -R $USER:$USER .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r tradia-backend/requirements.txt
```

7) Configure the bridge app
- Edit `/opt/Tradia/tradia-backend/app.py` already provides endpoints: /validate, /account_info, /positions, /orders, /deals.
- Export environment so Python MT5 module can launch the terminal via Wine and knows the terminal path:
```bash
echo 'MT5_TERMINAL_PATH=/opt/mt5/wine/drive_c/Program Files/MetaTrader 5/terminal64.exe' | sudo tee -a /etc/environment
echo 'WINEPREFIX=/opt/mt5/wine' | sudo tee -a /etc/environment
echo 'DISPLAY=:1' | sudo tee -a /etc/environment
```

8) Systemd units (Xvfb + Uvicorn)
- Create Xvfb service to provide a headless X display for Wine:
```bash
sudo tee /etc/systemd/system/xvfb@.service >/dev/null <<'EOF'
[Unit]
Description=Xvfb on display %i
After=network.target

[Service]
User=mt5
Environment=DISPLAY=:%i
ExecStart=/usr/bin/Xvfb :%i -screen 0 1024x768x24 -ac +extension GLX +render -noreset
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```
- Create the MT5 bridge service (runs uvicorn with the project venv):
```bash
sudo tee /etc/systemd/system/mt5-bridge.service >/dev/null <<'EOF'
[Unit]
Description=Tradia MT5 Bridge (FastAPI)
After=network-online.target xvfb@1.service
Wants=network-online.target xvfb@1.service

[Service]
Type=simple
User=mt5
WorkingDirectory=/opt/Tradia
Environment=PATH=/opt/Tradia/.venv/bin:/usr/local/bin:/usr/bin
Environment=PYTHONUNBUFFERED=1
Environment=WINEPREFIX=/opt/mt5/wine
Environment=DISPLAY=:1
Environment=MT5_TERMINAL_PATH=/opt/mt5/wine/drive_c/Program Files/MetaTrader 5/terminal64.exe
ExecStart=/opt/Tradia/.venv/bin/uvicorn app:app --app-dir tradia-backend --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```
- Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable xvfb@1.service mt5-bridge.service
sudo systemctl start xvfb@1.service mt5-bridge.service
sudo systemctl status mt5-bridge --no-pager -l
```

9) Cloudflare Tunnel (named) to mt5.your-domain
```bash
curl -fsSL https://pkg.cloudflare.com/install.sh | sudo bash
sudo apt-get install -y cloudflared
```
- Login (follow link in output):
```bash
cloudflared tunnel login
```
- Create a tunnel and config:
```bash
cloudflared tunnel create tradia-mt5
TUNNEL_ID=$(ls /home/$USER/.cloudflared/*.json | sed 's/.*\///; s/.json$//')
sudo tee /etc/cloudflared/config.yml >/dev/null <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: /home/$USER/.cloudflared/${TUNNEL_ID}.json
ingress:
  - hostname: mt5.your-domain.com
    service: http://127.0.0.1:8000
  - service: http_status:404
EOF
```
- Route your DNS (requires your domain on Cloudflare):
```bash
cloudflared tunnel route dns ${TUNNEL_ID} mt5.your-domain.com
```
- Run as a service:
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl restart cloudflared
sudo systemctl status cloudflared --no-pager -l
```

10) App configuration (Next.js)
- Set envs and redeploy:
```
MT5_WEB_API_URL=https://mt5.your-domain.com
NEXTAUTH_URL=https://tradiaai.app
MT5_ENCRYPTION_KEY=<64-hex>
```

11) Validate
- Health: `curl https://mt5.your-domain.com/health`
- Docs: open `https://mt5.your-domain.com/docs`
- App: use Connect MT5 in the UI; it should validate and store credentials, then sync.

Notes & Tips
- If MT5 initialization fails, ensure terminal exists at MT5_TERMINAL_PATH, Wine prefix is set, and Xvfb is running.
- For some brokers, launching MT5 once interactively under Wine (x11vnc or a temporary desktop) can help initialize configuration files.
- Always keep the bridge bound to 127.0.0.1; Cloudflare Tunnel handles public exposure.

