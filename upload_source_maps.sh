#!/bin/bash

# Utility to upload source maps to sentry.
# Should actually be a node script to ensure cross platform compatibility.
# See https://github.com/getsentry/sentry-cli/issues/344

# Extract version from package.json
VERSION=$(node -pe "require('./package.json').version")

sentry_cli='./node_modules/.bin/sentry-cli'

# Checks if release already exists
$sentry_cli releases info $VERSION >/dev/null

if [ $? ]; then
	echo "Existing release. Deleting uploaded artifacts"
	$sentry_cli releases files $VERSION delete --all
else 
	echo "Creating new release"
	$sentry_cli releases new $VERSION --finalize
fi

echo "Uploading release artifacts"
$sentry_cli releases files $VERSION upload-sourcemaps build/ --rewrite --url-prefix '~/build/'
