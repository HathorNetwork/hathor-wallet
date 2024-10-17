#!/bin/bash
set -eu

APPARMOR_PROFILE_DEST="/etc/apparmor.d/hathor-wallet"

# Remove apparmor profile.
if [ -f "$APPARMOR_PROFILE_DEST" ]; then
  rm -f "$APPARMOR_PROFILE_DEST"
fi
