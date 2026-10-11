#!/usr/bin/env bash
# Install one official Beads release for Linux into a directory, verifying its published checksum.
# Usage: scripts/install-bd.sh <version, e.g. 1.3.1> <destination-dir>

set -euo pipefail

VERSION="${1:?usage: install-bd.sh <version> <destination-dir>}"
DEST="${2:?usage: install-bd.sh <version> <destination-dir>}"
VERSION="${VERSION#v}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Expected a stable semver release, got: $VERSION" >&2
  exit 1
fi

case "$(uname -m)" in
  x86_64 | amd64) ARCH=amd64 ;;
  aarch64 | arm64) ARCH=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

ASSET="beads_${VERSION}_linux_${ARCH}.tar.gz"
BASE="https://github.com/gastownhall/beads/releases/download/v${VERSION}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

curl -fsSL --retry 3 -o "$WORK/$ASSET" "$BASE/$ASSET"
curl -fsSL --retry 3 -o "$WORK/checksums.txt" "$BASE/checksums.txt"
EXPECTED="$(awk -v asset="$ASSET" '$2 == asset { print $1 }' "$WORK/checksums.txt")"
if [[ -z "$EXPECTED" ]]; then
  echo "No checksum published for $ASSET" >&2
  exit 1
fi
echo "$EXPECTED  $WORK/$ASSET" | sha256sum -c --quiet -

mkdir -p "$WORK/extract" "$DEST"
tar -xzf "$WORK/$ASSET" -C "$WORK/extract" bd
install -m 0755 "$WORK/extract/bd" "$DEST/bd"
"$DEST/bd" version
