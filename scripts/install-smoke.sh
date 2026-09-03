#!/usr/bin/env bash
# L5 install smoke: the README install path, hermetic and repeatable.
#
# Default (CI): pack the CURRENT repo into a tarball — `files` whitelist
# included — install it into a fresh temp profile via `dsh plugin add`, boot a
# real dsh web, and assert the plugin tree loads, /pomasa answers, and the
# client bundle is served. This tests the code being pushed, not an older
# published build.
#
# Registry mode: POMASA_INSTALL_SPEC=pomasa-studio (or @<version>, or a spec
# pnpm accepts) installs from npm instead — the exact README flow, for release
# verification after publish.
#
# Never touches a real profile: DSH_HOME/POMASA_HOME point at a temp dir that
# is removed on exit. dsh/pnpm must be on PATH (exit 2 = "skipped", for hooks).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${POMASA_INSTALL_PORT:-43994}"
BASE="/tmp/pomasa-install-smoke-$$"
PLUGIN_ROOT_PATTERN='profiles/web/node_modules/pomasa-studio'

command -v dsh >/dev/null 2>&1 \
  || { echo "skip: 'dsh' CLI not found on PATH (install smoke needs it; docker CI: POMASA_INSTALL_SPEC via npm+publish)" >&2; exit 2; }
command -v pnpm >/dev/null 2>&1 \
  || { echo "skip: 'pnpm' not found on PATH — dsh plugin installs via pnpm" >&2; exit 2; }

mkdir -p "$BASE"
trap 'rm -rf "$BASE"' EXIT

export DSH_HOME="$BASE/dsh_home"
export POMASA_HOME="$BASE/pomasa_home"
mkdir -p "$POMASA_HOME"

# --- pick install source ---------------------------------------------------
SPEC="${POMASA_INSTALL_SPEC:-}"
if [ -n "$SPEC" ]; then
  PKG="$SPEC"
  MODE="registry:${SPEC}"
else
  DEST="$BASE/pkg"
  mkdir -p "$DEST"
  (cd "$ROOT" && npm pack --pack-destination "$DEST" >/dev/null)
  PKG_FILE="$(ls "$DEST"/*.tgz | head -1)"
  [ -n "$PKG_FILE" ] || { echo "FAIL: no tarball produced" >&2; exit 1; }
  # Package integrity in one shot: every path the host needs at boot must be
  # inside the tarball. This is the box the Windows loader ENOENT'd on.
  FAIL=0
  for need in \
    package/skill/SKILL.md \
    package/skill/pattern-catalog/README.md \
    package/lib/client.js \
    package/lib/index.js \
    package/cordis.patch.yml \
    package/pomasa-home/AGENTS.md \
    package/pomasa-home/.dsh/mcp.servers.yml \
    package/scripts/bundle-client.mjs; do
    if ! tar tzf "$PKG_FILE" | grep -qFx "$need"; then
      echo "FAIL: tarball missing $need" >&2
      FAIL=1
    fi
  done
  [ "$FAIL" = "0" ] || { echo "tarball: $(basename "$PKG_FILE")" >&2; exit 1; }
  PKG="$PKG_FILE"
  MODE="local-tarball:$(basename "$PKG_FILE")"
fi

# --- the README flow -------------------------------------------------------
dsh --profile web --help >/dev/null 2>&1
dsh plugin --profile web add "$PKG" >/dev/null 2>&1 \
  || { echo "FAIL: dsh plugin add $PKG" >&2; exit 1; }

# Post-install: the exact scandir target the Windows build failed on.
PLUGIN_ROOT="$DSH_HOME/$PLUGIN_ROOT_PATTERN"
if [ ! -d "$PLUGIN_ROOT/skill" ]; then
  echo "FAIL: $PLUGIN_ROOT/skill not present after install (Windows 'scandir .../skill' ENOENT target)" >&2
  exit 1
fi
for f in lib/index.js lib/client.js cordis.patch.yml package.json; do
  [ -f "$PLUGIN_ROOT/$f" ] || { echo "FAIL: installed package missing $f" >&2; exit 1; }
done
grep -q 'pomasa-studio' "$DSH_HOME/profiles/web/package.json" \
  || { echo "FAIL: profile manifest does not list pomasa-studio" >&2; exit 1; }

# --- boot and assert -------------------------------------------------------
dsh --profile web --no-open --port "$PORT" >"$BASE/dsh.log" 2>&1 &
DPID=$!
trap 'kill "$DPID" 2>/dev/null || true; rm -rf "$BASE"' EXIT

ready=0
for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${PORT}/pomasa/mas.list" -o /dev/null 2>/dev/null; then ready=1; break; fi
  sleep 0.5
done
if [ "$ready" != "1" ]; then
  echo "FAIL: dsh web did not become ready" >&2
  tail -30 "$BASE/dsh.log" 2>/dev/null || true
  exit 1
fi

BODY="$(curl -sf "http://127.0.0.1:${PORT}/pomasa/mas.list")"
echo "$BODY" | grep -q '"ok":true' \
  || { echo "FAIL: mas.list envelope — $BODY" >&2; exit 1; }

curl -sf "http://127.0.0.1:${PORT}/plugins/pomasa-studio/client.js" -o /dev/null \
  || { echo "FAIL: client bundle not served" >&2; exit 1; }

RESP="$(curl -s -X POST -H 'Content-Type: application/json' -d '{}' "http://127.0.0.1:${PORT}/pomasa/mas.create")"
echo "$RESP" | grep -q '"ok":false' \
  || { echo "FAIL: create validation should error — $RESP" >&2; exit 1; }

echo "install smoke OK (${MODE}, port ${PORT}, skill present, /pomasa reachable)"