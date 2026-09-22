#!/bin/bash
# Install systemd service to auto-start Dashboard Geography at boot
# Usage: sudo ./install_autostart_systemd.sh

set -e

SERVICE_NAME=dashboard-geography
USER_NAME=pi
APP_DIR=/home/pi/Desktop/Dashboard_Geography_1
START_SCRIPT=$APP_DIR/start_app.sh
SERVICE_PATH=/etc/systemd/system/${SERVICE_NAME}.service

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run this script with sudo: sudo $0"
  exit 1
fi

if [ ! -f "$START_SCRIPT" ]; then
  echo "Start script not found at $START_SCRIPT"
  exit 1
fi

cat > "$SERVICE_PATH" << EOF
[Unit]
Description=Dashboard Geography Electron (system)
After=network-online.target graphical.target systemd-user-sessions.service
Wants=graphical.target

[Service]
Type=simple
User=$USER_NAME
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/$USER_NAME/.Xauthority
WorkingDirectory=$APP_DIR
# Give desktop a moment to be ready
ExecStartPre=/bin/sleep 6
ExecStart=/usr/bin/bash -lc '$START_SCRIPT'
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}.service
systemctl restart ${SERVICE_NAME}.service || true

echo ""
echo "Installed service: $SERVICE_PATH"
echo "Enabled and started ${SERVICE_NAME}.service"
echo "Check status with: sudo systemctl status ${SERVICE_NAME}.service"
echo "View logs:        sudo journalctl -u ${SERVICE_NAME}.service -b --no-pager"





