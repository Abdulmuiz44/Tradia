#!/usr/bin/env bash
set -euo pipefail

export DISPLAY=${DISPLAY:-:1}
export WINEPREFIX=${WINEPREFIX:-/home/mt5/.wine}
export MT5_HOME=${MT5_HOME:-/home/mt5/MetaTrader}
export MT5_INSTALLER_URL=${MT5_INSTALLER_URL:-https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe}
export TZ=${TZ:-UTC}

MT5_SERVER=${MT5_SERVER:-}
MT5_LOGIN=${MT5_LOGIN:-}
MT5_PASSWORD=${MT5_PASSWORD:-}
ENABLE_VNC=${ENABLE_VNC:-}
VNC_PASSWORD=${VNC_PASSWORD:-}

echo "[entrypoint] Starting Xvfb on ${DISPLAY}"
Xvfb ${DISPLAY} -screen 0 1280x800x24 -ac -nolisten tcp &
sleep 1

if [[ -n "${ENABLE_VNC}" ]]; then
  echo "[entrypoint] Starting x11vnc"
  if [[ -n "${VNC_PASSWORD}" ]]; then
    x11vnc -storepasswd "${VNC_PASSWORD}" /home/mt5/.vncpass >/dev/null 2>&1 || true
    x11vnc -display ${DISPLAY} -rfbauth /home/mt5/.vncpass -forever -shared -nopw -rfbport 5901 &
  else
    x11vnc -display ${DISPLAY} -forever -shared -nopw -rfbport 5901 &
  fi
fi

echo "[entrypoint] Initializing Wine prefix: ${WINEPREFIX}"
winecfg >/dev/null 2>&1 || true

MT5_DIR_WIN="C:\\Program Files\\MetaTrader 5"
MT5_TERMINAL_WIN="${MT5_DIR_WIN}\\terminal64.exe"
MT5_TERMINAL_LNX="${WINEPREFIX}/drive_c/Program Files/MetaTrader 5/terminal64.exe"

if [[ ! -f "${MT5_TERMINAL_LNX}" ]]; then
  echo "[entrypoint] Downloading MT5 installer"
  cd /home/mt5
  curl -fSL "${MT5_INSTALLER_URL}" -o mt5setup.exe
  echo "[entrypoint] Installing MT5 via Wine (GUI suppressed)"
  wine mt5setup.exe >/dev/null 2>&1 || true
  # wait a bit for installation to complete
  sleep 15
fi

if [[ ! -f "${MT5_TERMINAL_LNX}" ]]; then
  echo "[entrypoint] ERROR: MT5 terminal not found at ${MT5_TERMINAL_LNX}"
  ls -la "${WINEPREFIX}/drive_c/Program Files" || true
  tail -n +1 /home/mt5/*.log 2>/dev/null || true
  exit 1
fi

echo "[entrypoint] Writing MT5 config from template"
if [[ -z "${MT5_SERVER}" || -z "${MT5_LOGIN}" || -z "${MT5_PASSWORD}" ]]; then
  echo "[entrypoint] WARNING: MT5_SERVER/MT5_LOGIN/MT5_PASSWORD not set. Terminal will start without auto-login."
fi

sed -e "s/{{SERVER}}/${MT5_SERVER}/g" \
    -e "s/{{LOGIN}}/${MT5_LOGIN}/g" \
    -e "s/{{PASSWORD}}/${MT5_PASSWORD}/g" \
  /home/mt5/mt5-config.tpl > /home/mt5/terminal.ini

echo "[entrypoint] Launching MT5 Terminal"
wine "${MT5_TERMINAL_LNX}" /config:Z:\\home\\mt5\\terminal.ini /portable >/home/mt5/terminal_stdout.log 2>/home/mt5/terminal_stderr.log &

echo "[entrypoint] Fluxbox session (optional)"
/home/mt5/.config/start-fb.sh &

echo "[entrypoint] Tailing logs to keep container alive"
touch /home/mt5/terminal_stdout.log /home/mt5/terminal_stderr.log
tail -F /home/mt5/terminal_stdout.log /home/mt5/terminal_stderr.log

