#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "${ROOT}"
DOCKER_BUILDKIT=1 tilt down || true
k3d cluster delete k8s-images-manager
