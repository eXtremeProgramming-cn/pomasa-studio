#!/usr/bin/env bash
# L3 transport smoke: boot a real dsh web on a temp profile + this plugin,
# curl the /pomasa endpoints, assert the RPC channel and client bundle exist.
# Never touches a real profile. Temp home removed on exit.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${POMASA_TRANSPORT_PORT:-43991}"
BASE="/tmp/pomasa-smoke-$$"
mkdir -p "$BASE"

export DSH_HOME="$BASE/dsh_home"
export POMASA_HOME="$BASE/pomasa_home"
mkdir -p "$POMASA_HOME"

dsh --profile web --help >/dev/null 2>&1
dsh plugin --profile web add "$ROOT" >/dev/null 2>&1
dsh --profile web --no-open --port "$PORT" >"$BASE/dsh.log" 2>&1 &
DASH_PID=$!
trap 'kill "$DASH_PID" 2>/dev/null || true; rm -rf "$BASE"' EXIT

ready=0
for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${PORT}/pomasa/mas.list" -o /dev/null 2>/dev/null; then
    ready=1
    break
  fi
  sleep 0.5
done
if [ "$ready" != "1" ]; then
  echo "FAIL: dsh web did not become ready"
  tail -20 "$BASE/dsh.log" || true
  exit 1
fi

BODY=$(curl -sf "http://127.0.0.1:${PORT}/pomasa/mas.list")
echo "$BODY" | grep -q '"ok":true' || { echo "FAIL: mas.list envelope"; echo "$BODY"; exit 1; }

curl -sf "http://127.0.0.1:${PORT}/plugins/pomasa-studio/client.js" -o /dev/null \
  || { echo "FAIL: client bundle not served"; exit 1; }

RESP=$(curl -s -X POST -H 'Content-Type: application/json' -d '{}' "http://127.0.0.1:${PORT}/pomasa/mas.create")
echo "$RESP" | grep -q '"ok":false' || { echo "FAIL: create validation should error"; echo "$RESP"; exit 1; }

echo "transport smoke OK (port ${PORT})"