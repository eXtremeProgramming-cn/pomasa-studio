#!/usr/bin/env bash
# Package integrity: the npm tarball governed by package.json "files" must
# carry every path the host needs at boot. Catches packaging regressions like
# `skill/` dropping out of the tarball — the box DSH Desktop's loader scans.
# Fast, no dsh, no network.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="/tmp/pomasa-pack-check-$$"
mkdir -p "$BASE"
trap 'rm -rf "$BASE"' EXIT

(cd "$ROOT" && npm pack --pack-destination "$BASE" >/dev/null)
PKG_FILE="$(ls "$BASE"/*.tgz | head -1)"
[ -n "$PKG_FILE" ] || { echo "FAIL: no tarball produced" >&2; exit 1; }

FAIL=0
for need in \
  package/skill/SKILL.md \
  package/skill/pattern-catalog/README.md \
  package/lib/client.js \
  package/lib/index.js \
  package/cordis.patch.yml \
  package/pomasa-home/AGENTS.md \
  package/pomasa-home/.dsh/mcp.servers.yml \
  package/scripts/bundle-client.mjs \
  package/src/host/apply.js \
  package/src/host/core/paths.js; do
  if ! tar tzf "$PKG_FILE" | grep -qFx "$need"; then
    echo "FAIL: tarball missing $need" >&2
    FAIL=1
  fi
done

if [ "$FAIL" = "0" ]; then
  echo "package integrity OK ($(basename "$PKG_FILE"), $(tar tzf "$PKG_FILE" | wc -l | tr -d ' ') entries)"
  exit 0
fi
tar tzf "$PKG_FILE" | awk -F/ '{print NF-1, $0}' | sort -n | head -40
exit 1