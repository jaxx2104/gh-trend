#!/usr/bin/env bash
# Builds the local `gh-trend` binary. Used by `gh extension install .`.
set -euo pipefail
cd "$(dirname "$0")/.."
bun install --frozen-lockfile
bun build --compile --outfile gh-trend src/cli.ts
