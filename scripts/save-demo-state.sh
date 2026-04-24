#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_ROOT="${HIVEMIND_DATA_ROOT:-"$ROOT_DIR/.hivemind"}"
SNAPSHOT="${HIVEMIND_DEMO_SNAPSHOT:-"$ROOT_DIR/bootstrap/demo-hivemind-state.tar.gz"}"

if [[ ! -d "$DATA_ROOT" ]]; then
  echo "HiveMind data root does not exist: $DATA_ROOT" >&2
  exit 1
fi

SNAPSHOT_DIR="$(dirname "$SNAPSHOT")"
mkdir -p "$SNAPSHOT_DIR"
DATA_ROOT_ABS="$(cd "$DATA_ROOT" && pwd -P)"
SNAPSHOT_ABS="$(cd "$SNAPSHOT_DIR" && pwd -P)/$(basename "$SNAPSHOT")"

case "$SNAPSHOT_ABS" in
  "$DATA_ROOT_ABS"/*)
    echo "Refusing to write the demo snapshot inside the HiveMind data root." >&2
    exit 1
    ;;
esac

tar --exclude=./current-work-unit.json -czf "$SNAPSHOT_ABS" -C "$DATA_ROOT_ABS" .

echo "Saved HiveMind demo state:"
echo "  data root: $DATA_ROOT_ABS"
echo "  snapshot:  $SNAPSHOT_ABS"
