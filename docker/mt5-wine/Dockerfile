FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    WINEDEBUG=-all \
    DISPLAY=:1 \
    WINEPREFIX=/home/mt5/.wine \
    WINEDLLOVERRIDES=winemenubuilder.exe=d \
    MT5_HOME=/home/mt5/MetaTrader \
    MT5_INSTALLER_URL=https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe

RUN apt-get update && apt-get install -y --no-install-recommends \
    gnupg2 ca-certificates curl wget unzip xz-utils \
    xvfb x11vnc fluxbox \
    cabextract winbind \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Install WineHQ Stable
RUN dpkg --add-architecture i386 && \
    mkdir -pm755 /etc/apt/keyrings && \
    curl -fsSL https://dl.winehq.org/wine-builds/winehq.key | tee /etc/apt/keyrings/winehq-archive.key >/dev/null && \
    curl -fsSL https://dl.winehq.org/wine-builds/ubuntu/dists/jammy/winehq-jammy.sources | tee /etc/apt/sources.list.d/winehq.sources && \
    apt-get update && apt-get install -y --install-recommends winehq-stable && \
    rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -ms /bin/bash mt5
USER mt5
WORKDIR /home/mt5

# Prepare directories
RUN mkdir -p "$MT5_HOME" /home/mt5/.config && \
    printf "#!/bin/sh\nfluxbox &\nwhile true; do sleep 60; done\n" > /home/mt5/.config/start-fb.sh && \
    chmod +x /home/mt5/.config/start-fb.sh

# Copy scripts and templates
COPY --chown=mt5:mt5 entrypoint.sh /home/mt5/entrypoint.sh
COPY --chown=mt5:mt5 mt5-config.tpl /home/mt5/mt5-config.tpl
RUN chmod +x /home/mt5/entrypoint.sh

EXPOSE 5901

ENTRYPOINT ["/home/mt5/entrypoint.sh"]
