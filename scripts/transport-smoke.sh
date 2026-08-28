#!/usr/bin/env bash
# L3 transport smoke — boots a hermetic dsh web in a temp DSH_HOME, mounts this
# plugin, and probes: bundle mounted, RPC channel alive, client bundle served.
# Never touches the real ~/.dsh profile. Use --port <N> to override POMASA_SMOKE_PORT.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${POMASA_SMOKE_PORT:-43111}"
HOME_DIR="$(mktemp -d /tmp/pomasa-smoke-XXXXXX)"
DSPID=""
cleanup() {
  if [ -n "$DSPID" ]; then kill "$DSPID" 2>/dev/null || true; fi
  rm -rf "$HOME_DIR"
}
trap cleanup EXIT

export DSH_HOME="$HOME_DIR"
dsh --profile web --help >/dev/null 2>&1          # auto-create the empty web profile
dsh plugin --profile web add "$ROOT" >/dev/null 2>&1   # add this plugin (link dep + bundle)
DSH_HOME="$HOME_DIR" dsh --profile web --no-open --port "$PORT" >"$HOME_DIR/server.log" 2>&1 &
DSPID=$!

ready=""
for _ in $(seq 1 80); do
  if curl -s -o /dev/null "http://127.0.0.1:$PORT/api/session.list" 2>/dev/null; then ready=1; break; fi
  sleep 0.5
done
if [ -z "$ready" ]; then
  echo "FAIL: dsh web did not become ready"; tail -20 "$HOME_DIR/server.log"; exit 1
fi

MASSES="$(curl -s "http://127.0.0.1:$PORT/pomasa/mas.list")"
echo "$MASSES" | grep -q '"ok":true' || { echo "FAIL mas.list: $MASSES"; exit 1; }
curl -s "http://127.0.0.1:$PORT/" | grep -q '/plugins/pomasa-studio/client.js' \
  || { echo "FAIL: client.js not referenced in homepage"; exit 1; }
CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/plugins/pomasa-studio/client.js")"
[ "$CODE" = "200" ] || { echo "FAIL: bundle http $CODE"; exit 1; }
B404="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/pomasa/nope")"
[ "$B404" = "404" ] || { echo "FAIL: unknown route should 404, got $B404"; exit 1; }

echo "transport smoke OK — bundle mounted, RPC alive, client served (http $CODE)"