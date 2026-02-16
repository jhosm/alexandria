#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."
cd "$ROOT"

VERSION=$(node -p "require('./package.json').version")
PLATFORM=$(node -p "process.platform")
ARCH=$(node -p "process.arch")
BUNDLE_NAME="alexandria-${VERSION}-${PLATFORM}-${ARCH}.mcpb"
STAGING=".mcpb-staging"
OUTDIR="bundles"

echo "==> Building TypeScript"
npx tsc

echo "==> Preparing staging directory"
rm -rf "$STAGING"
mkdir -p "$STAGING"

cp -r dist "$STAGING/dist"
cp package.json "$STAGING/package.json"
cp manifest.json "$STAGING/manifest.json"

echo "==> Installing production dependencies"
cd "$STAGING"
npm install --omit=dev --ignore-scripts=false
cd "$ROOT"

echo "==> Creating bundle: $BUNDLE_NAME"
mkdir -p "$OUTDIR"
cd "$STAGING"
zip -r -q "../$OUTDIR/$BUNDLE_NAME" .
cd "$ROOT"

echo "==> Cleaning up"
rm -rf "$STAGING"

echo "==> Done: $OUTDIR/$BUNDLE_NAME"
