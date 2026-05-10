#!/usr/bin/env bash
set -euo pipefail

corepack enable

corepack install

yarn config set --home enableTelemetry 0

yarn install --immutable
