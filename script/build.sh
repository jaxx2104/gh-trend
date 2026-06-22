#!/usr/bin/env bash
# Builds the local `gh-trend` binary. Used by `gh extension install .`.
set -euo pipefail
cd "$(dirname "$0")/.."
deno compile --allow-net=github.com --allow-run=gh --allow-env -o gh-trend src/cli.ts
