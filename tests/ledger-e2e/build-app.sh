#!/usr/bin/env bash
# Build the Hathor Ledger app ELF for Speculos, inside Ledger's builder image.
#
#   tests/ledger-e2e/build-app.sh            # build (or reuse the cached ELF)
#   FORCE=1 tests/ledger-e2e/build-app.sh    # rebuild even if cached
#
# Env:
#   LEDGER_APP_DIR  clone of HathorNetwork/hathor-ledger-app
#                   (default: sibling of the wallet repo, ../hathor-ledger-app)
#   LEDGER_APP_REF  git ref to build (default: origin/master)
#   LEDGER_MODEL    nanosp | nanox | nanos (default: nanosp)
#   LEDGER_E2E_CACHE  where the ELF is cached (default: ~/.cache/hathor-ledger-e2e)
#
# Prints the path of the cached ELF on the last line of stdout.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WALLET_ROOT="$(cd "$HERE/../.." && pwd)"
LEDGER_APP_DIR="${LEDGER_APP_DIR:-$(dirname "$WALLET_ROOT")/hathor-ledger-app}"
LEDGER_APP_REPO="${LEDGER_APP_REPO:-https://github.com/HathorNetwork/hathor-ledger-app.git}"
LEDGER_APP_REF="${LEDGER_APP_REF:-origin/master}"
LEDGER_MODEL="${LEDGER_MODEL:-nanosp}"
CACHE="${LEDGER_E2E_CACHE:-$HOME/.cache/hathor-ledger-e2e}"
BUILDER_IMAGE="${BUILDER_IMAGE:-ghcr.io/ledgerhq/ledger-app-builder/ledger-app-builder:latest}"

case "$LEDGER_MODEL" in
  nanosp) SDK_VAR=NANOSP_SDK; BUILD_DIR=nanos2 ;;
  nanox)  SDK_VAR=NANOX_SDK;  BUILD_DIR=nanox ;;
  nanos)  SDK_VAR=NANOS_SDK;  BUILD_DIR=nanos ;;
  *) echo "unknown LEDGER_MODEL=$LEDGER_MODEL" >&2; exit 2 ;;
esac

if [ ! -d "$LEDGER_APP_DIR/.git" ]; then
  echo "Cloning $LEDGER_APP_REPO into $LEDGER_APP_DIR" >&2
  git clone -q "$LEDGER_APP_REPO" "$LEDGER_APP_DIR"
fi
git -C "$LEDGER_APP_DIR" fetch -q origin || echo "warning: fetch failed, using local refs" >&2
SHA="$(git -C "$LEDGER_APP_DIR" rev-parse --short=12 "$LEDGER_APP_REF")"
ELF="$CACHE/hathor-$LEDGER_MODEL-$SHA.elf"

if [ -f "$ELF" ] && [ -z "${FORCE:-}" ]; then
  echo "Using cached ELF ($LEDGER_MODEL @ $SHA)" >&2
  echo "$ELF"
  exit 0
fi

git -C "$LEDGER_APP_DIR" checkout -q --detach "$SHA"
mkdir -p "$CACHE"
echo "Building $LEDGER_MODEL ELF @ $SHA in $BUILDER_IMAGE" >&2
start=$(date +%s)
# Run as the host user so build/ stays deletable without sudo.
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$LEDGER_APP_DIR:/app" -w /app "$BUILDER_IMAGE" \
  bash -c "make clean >/dev/null 2>&1 || true; make BOLOS_SDK=\$$SDK_VAR DEBUG=1" >&2
cp "$LEDGER_APP_DIR/build/$BUILD_DIR/bin/app.elf" "$ELF"
echo "Built in $(( $(date +%s) - start ))s" >&2
echo "$ELF"
