#!/bin/bash
# Installs (or removes with --uninstall) the launchd job that runs the outreach worker Mon-Thu at 08:05 local time.
# Does not use sudo. The pmset wake line is printed for you to run yourself.
set -euo pipefail

LABEL="com.verixa.outreach-worker"
WORKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$WORKER_DIR/.state/logs"
TARGET="$HOME/Library/LaunchAgents/$LABEL.plist"

if [[ "${1:-}" == "--uninstall" ]]; then
  launchctl unload "$TARGET" 2>/dev/null || true
  rm -f "$TARGET"
  echo "Removed $LABEL. If you set a wake schedule, clear it with: sudo pmset repeat cancel"
  exit 0
fi

if [[ ! -f "$WORKER_DIR/.env" ]]; then
  echo "Missing $WORKER_DIR/.env. Copy .env.example to .env and fill it in first." >&2
  exit 1
fi

mkdir -p "$LOG_DIR" "$HOME/Library/LaunchAgents"
sed -e "s|__WORKER_DIR__|$WORKER_DIR|g" -e "s|__LOG_DIR__|$LOG_DIR|g" "$WORKER_DIR/launchd/$LABEL.plist" > "$TARGET"
plutil -lint "$TARGET"
launchctl unload "$TARGET" 2>/dev/null || true
launchctl load "$TARGET"
echo "Installed $LABEL (Mon-Thu 08:05). Logs: $LOG_DIR"
echo
echo "To wake the Mac before the run, execute this yourself (needs sudo, not run by this script):"
echo "  sudo pmset repeat wakeorpoweron MTWR 07:55:00"
