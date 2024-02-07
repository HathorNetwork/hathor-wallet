#!/bin/bash
#
# Script to release new versions for Windows, macOS, and Linux.
#
# This script expects a file `./env` with exported envvars to sign executables
# for Windows and macOS.
#
# The commented cmdlines were used in the past to fix different kind of issues.
# They were left here because they might be useful for troubleshooting in the future.

set -e  # Exit on any command failure.
set -u  # Exit on unset variables.

step0() {
	echo Environment:
	echo - node $(node -v)
	echo - npm $(npm -v)
	echo - python $(python --version | awk '{print $2}')
	echo
}

step1() {
	echo step1: cleaning and installing dependencies
	rm -rf node_modules/
	npm install
}

step2() {
	echo step2: transaction checks and building
	make check
	make i18n

	rm -rf build/
	#export NODE_OPTIONS=--max_old_space_size=2048
	npm run build
}

step3() {
	echo "step3: actions between building and packaging"

	echo "- Quick fix for Issue 484: https://github.com/HathorNetwork/hathor-wallet/issues/484"
	rm ./node_modules/usb/binding.gyp
}

step4() {
	echo step4: packing
	source ./env
	npm run electron-pack-linux
	npm run electron-pack-win
	npm run electron-pack-mac
}

step0
step1
step2
step3
step4
