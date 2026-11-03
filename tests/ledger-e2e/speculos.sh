#!/usr/bin/env bash
# Start / stop the Speculos emulator with the Hathor app and a fixed test seed.
#
#   tests/ledger-e2e/speculos.sh start <app.elf>   # start and wait until ready
#   tests/ledger-e2e/speculos.sh stop              # remove the container
#   tests/ledger-e2e/speculos.sh logs
#
# Env: SPECULOS_API_PORT (5000), SPECULOS_APDU_PORT (9999),
#      SPECULOS_CONTAINER (hathor-ledger-e2e-speculos), LEDGER_MODEL (nanosp),
#      SPECULOS_SEED (the Speculos default test mnemonic, see below).
set -euo pipefail

IMAGE="${SPECULOS_IMAGE:-ghcr.io/ledgerhq/speculos:latest}"
NAME="${SPECULOS_CONTAINER:-hathor-ledger-e2e-speculos}"
API_PORT="${SPECULOS_API_PORT:-5000}"
APDU_PORT="${SPECULOS_APDU_PORT:-9999}"
MODEL="${LEDGER_MODEL:-nanosp}"
# Speculos's own default mnemonic, public test data. Never put a real seed here.
# m/44'/280'/0'/0/0 on mainnet is HJYAnivCTdRtxcgeJW8pKk1y7przypne3C.
SEED="${SPECULOS_SEED:-glory promote mansion idle axis finger extra february uncover one trip resource lawn turtle enact monster seven myth punch hobby comfort wild raise skin}"
API="http://127.0.0.1:$API_PORT"

screen_text() { curl -s "$API/events?currentscreenonly=true" | python3 -c 'import json,sys; print(" | ".join(e.get("text","") for e in json.load(sys.stdin).get("events",[])))' 2>/dev/null || true; }

case "${1:-}" in
  start)
    ELF="$(readlink -f "${2:?usage: speculos.sh start <app.elf>}")"
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    docker run -d --name "$NAME" \
      -p "127.0.0.1:$API_PORT:5000" -p "127.0.0.1:$APDU_PORT:9999" \
      -v "$(dirname "$ELF"):/elf:ro" "$IMAGE" \
      --model "$MODEL" --display headless --api-port 5000 --apdu-port 9999 \
      --seed "$SEED" "/elf/$(basename "$ELF")" >/dev/null
    for _ in $(seq 1 60); do
      curl -sf "$API/events" >/dev/null 2>&1 && break
      sleep 0.5
    done
    curl -sf "$API/events" >/dev/null || { docker logs "$NAME" | tail -20 >&2; echo "Speculos did not start" >&2; exit 1; }
    # The app opens on a "Pending Ledger review" screen; both buttons dismiss it.
    for _ in $(seq 1 20); do
      txt="$(screen_text)"
      case "$txt" in
        *[Pp]ending*|*[Rr]eview*) curl -s -XPOST "$API/button/both" -d '{"action":"press-and-release"}' >/dev/null; sleep 0.5 ;;
        *Hathor*|*ready*|*Ready*) break ;;
        *) sleep 0.5 ;;
      esac
    done
    echo "Speculos ready on $API (apdu 127.0.0.1:$APDU_PORT), screen: $(screen_text)" >&2
    ;;
  stop)
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    ;;
  logs)
    docker logs "$NAME"
    ;;
  *)
    echo "usage: $0 start <app.elf> | stop | logs" >&2; exit 2 ;;
esac
