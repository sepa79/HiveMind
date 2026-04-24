#!/usr/bin/env bash
set -euo pipefail

resolve_path() {
  node -e 'console.log(require("node:path").resolve(process.argv[1]))' "$1"
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_ROOT="${HIVEMIND_DATA_ROOT:-"$ROOT_DIR/.hivemind"}"
SNAPSHOT="${HIVEMIND_DEMO_SNAPSHOT:-"$ROOT_DIR/bootstrap/demo-hivemind-state.tar.gz"}"
DATA_ROOT_ABS="$(resolve_path "$DATA_ROOT")"
SNAPSHOT_ABS="$(resolve_path "$SNAPSHOT")"

cd "$ROOT_DIR"

case "$DATA_ROOT_ABS" in
  "/"|"$HOME"|"$ROOT_DIR")
    echo "Refusing to use unsafe HiveMind data root: $DATA_ROOT_ABS" >&2
    exit 1
    ;;
esac

case "$SNAPSHOT_ABS" in
  "$DATA_ROOT_ABS"/*)
    echo "Refusing to read a demo snapshot from inside the HiveMind data root." >&2
    exit 1
    ;;
esac

mkdir -p "$(dirname "$DATA_ROOT_ABS")"

npm install
npm run bootstrap:hivemind

if [[ -f "$SNAPSHOT_ABS" ]]; then
  RESTORE_TMP="$(mktemp -d "${DATA_ROOT_ABS}.restore.XXXXXX")"
  cleanup_restore_tmp() {
    rm -rf "$RESTORE_TMP"
  }
  trap cleanup_restore_tmp EXIT

  tar -tzf "$SNAPSHOT_ABS" >/dev/null
  tar -xzf "$SNAPSHOT_ABS" -C "$RESTORE_TMP"

  rm -rf "$DATA_ROOT_ABS"
  mkdir -p "$DATA_ROOT_ABS"
  tar -cf - -C "$RESTORE_TMP" . | tar -xf - -C "$DATA_ROOT_ABS"
  cleanup_restore_tmp
  trap - EXIT

  npm run bootstrap:hivemind
  echo "Restored HiveMind demo state from $SNAPSHOT_ABS"
else
  echo "No demo snapshot found at $SNAPSHOT_ABS; seeded the base HiveMind project only."
fi

cat <<EOF

Next:
  npm run start:api
  open http://127.0.0.1:4010/
  npm run doctor
EOF
