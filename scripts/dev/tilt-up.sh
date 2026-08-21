#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLUSTER="k8s-images-manager"

if ! k3d cluster get "${CLUSTER}" >/dev/null 2>&1; then
  echo "Creating k3d cluster ${CLUSTER}..."
  k3d cluster create --config "${ROOT}/chart/k3d.yml"
fi

kubectl config use-context "k3d-${CLUSTER}" >/dev/null

cd "${ROOT}"
DOCKER_BUILDKIT=1 tilt up "$@"
