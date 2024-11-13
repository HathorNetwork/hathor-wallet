#!/bin/sh
#
# Generate SHA256SUMS and SHA256SUMS.asc from the most recent build.
#

# Setting flags to fail early, strict variable usage and verbose output
set -e
set -u
set -x

rm -f ./dist/SHA256SUMS
rm -f ./dist/SHA256SUMS.asc

# remove spaces from all filenames
(cd ./dist && find . -maxdepth 1 -type f -iname "* *" -print0 | xargs -0 -I {} bash -c 'mv "$0" "${0// /.}"' {})

# generate SHA256SUMS
(cd ./dist && find . -type f -iname \*wallet\* -mmin -180 -maxdepth 1 | xargs -L1 basename | xargs shasum -a 256 > SHA256SUMS)

gpg -s --detach-sign -a -u 0x8DE497EA ./dist/SHA256SUMS
