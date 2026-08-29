#!/bin/sh
# Builds a standalone Plain for each platform. Needs Bun: https://bun.sh
# Each one is about 60-90 MB, because the runtime travels with it.
set -e
mkdir -p dist
for target in bun-darwin-arm64 bun-darwin-x64 bun-linux-x64 bun-windows-x64; do
  name="plain-${target#bun-}"
  case "$target" in *windows*) name="$name.exe";; esac
  echo "building $name"
  bun build --compile --target="$target" plain.js --outfile "dist/$name"
done
echo "done — see dist/"
