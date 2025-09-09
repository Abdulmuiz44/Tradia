#!/usr/bin/env bash
set -euo pipefail

# Usage: sudo bash scripts/cloud/install_mt5_bridge_ubuntu.sh mt5.your-domain.com

DOMAIN=${1:-}
if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 mt5.your-domain.com" >&2
  exit 1
fi

apt-get update -y && apt-get upgrade -y
apt-get install -y software-properties-common curl unzip git python3 python3-venv python3-pip xvfb ca-certificates

# Wine + winetricks
dpkg --add-architecture i386
mkdir -pm755 /etc/apt/keyrings
wget -qO- https://dl.winehq.org/wine-builds/winehq.key | tee /etc/apt/keyrings/winehq-archive.key >/dev/null
wget -qO /etc/apt/sources.list.d/winehq-jammy.sources https://dl.winehq.org/wine-builds/ubuntu/dists/jammy/winehq-jammy.sources
apt-get update -y
apt-get install -y --install-recommends winehq-stable winetricks

# mt5 user + prefix
id -u mt5 &>/dev/null || useradd -m -s /bin/bash mt5
mkdir -p /opt/mt5 && chown -R mt5:mt5 /opt/mt5
sudo -u mt5 bash -lc 'export WINEPREFIX=/opt/mt5/wine; mkdir -p "$WINEPREFIX"; WINEDEBUG=-all wineboot -i'

# Download MT5 setup
sudo -u mt5 bash -lc 'cd /opt/mt5 && curl -fsSL -o mt5setup.exe "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"'
sudo -u mt5 bash -lc 'export WINEPREFIX=/opt/mt5/wine; xvfb-run -a wine /opt/mt5/mt5setup.exe /silent || true'

# Project venv
cd /opt
if [[ ! -d /opt/Tradia ]]; then
  echo "Clone your project into /opt/Tradia before running this script."
  exit 0
fi
cd /opt/Tradia
python3 -m venv .venv
chown -R mt5:mt5 .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r tradia-backend/requirements.txt

# System envs
echo 'WINEPREFIX=/opt/mt5/wine' >> /etc/environment
echo 'DISPLAY=:1' >> /etc/environment
echo 'MT5_TERMINAL_PATH=/opt/mt5/wine/drive_c/Program Files/MetaTrader 5/terminal64.exe' >> /etc/environment

# Xvfb unit
cat >/etc/systemd/system/xvfb@.service <<'EOF'
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

# Uvicorn unit
cat >/etc/systemd/system/mt5-bridge.service <<'EOF'
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

systemctl daemon-reload
systemctl enable xvfb@1.service mt5-bridge.service
systemctl start xvfb@1.service mt5-bridge.service

# Cloudflared
curl -fsSL https://pkg.cloudflare.com/install.sh | bash
apt-get install -y cloudflared

cloudflared tunnel login
cloudflared tunnel create tradia-mt5
TUNNEL_ID=$(ls ~/.cloudflared/*.json | sed 's/.*\///; s/.json$//')
cat >/etc/cloudflared/config.yml <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json
ingress:
  - hostname: ${DOMAIN}
    service: http://127.0.0.1:8000
  - service: http_status:404
EOF

cloudflared tunnel route dns ${TUNNEL_ID} ${DOMAIN}
cloudflared service install
systemctl enable cloudflared && systemctl restart cloudflared

echo "Done. Validate: curl https://${DOMAIN}/health"

