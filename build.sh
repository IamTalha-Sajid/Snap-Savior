#!/usr/bin/env bash
#
# Build script for Snap Savior Firefox extension.
# Produces snap-savior.zip suitable for submission to addons.mozilla.org.
# No transpilation, minification, or concatenation is performed;
# the add-on source files are packaged as-is.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_NAME="snap-savior.zip"
OUTPUT_PATH="${SCRIPT_DIR}/${OUTPUT_NAME}"

cd "$SCRIPT_DIR"

# Remove previous build
rm -f "$OUTPUT_PATH"

# Package only the files that are part of the extension.
# Exclude this script, README, dev-only files, and version control.
zip -r "$OUTPUT_PATH" \
  manifest.json \
  popup.html \
  popup.css \
  popup.js \
  background.js \
  content.js \
  icons/ \
  -x "*.git*" \
  -x "*__MACOSX*" \
  -x "*.DS_Store" \
  -x "build.sh" \
  -x "README.md" \
  -x "color-pallete.txt" \
  -x "*.md"

echo "Built: $OUTPUT_PATH"
