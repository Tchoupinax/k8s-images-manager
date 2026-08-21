#!/usr/bin/env bash
set -euo pipefail

pattern="${1:?usage: changed-since-prev-tag.sh <grep-extended-regex>}"
current="${GITHUB_REF_NAME:?GITHUB_REF_NAME is required}"
output="${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"

prev="$(git tag --list 'v*' --sort=-v:refname | grep -Fxv "${current}" | head -n1 || true)"

if [[ -z "${prev}" ]]; then
  echo "No previous v* tag; treating sources as changed"
  echo "changed=true" >> "${output}"
  exit 0
fi

echo "Comparing ${prev}..${current}"
if git diff --name-only "${prev}" "${current}" | grep -Eq "${pattern}"; then
  echo "Matching source files changed since ${prev}"
  echo "changed=true" >> "${output}"
else
  echo "No matching source files changed since ${prev}"
  echo "changed=false" >> "${output}"
fi
