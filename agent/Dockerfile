# Done from https://goreleaser.com/customization/dockers_v2/#how-it-works
#
# linked dep
# FROM scratch

# alpine 3.23.0
# FROM alpine@sha256:51183f2cfa6320055da30872f211093f9ff1d3cf06f39a0bdb212314c5dc7375

FROM ubuntu:24.04

ARG TARGETPLATFORM
ARG TARGETARCH

RUN groupadd --system --gid 999 k8simagemanager && \
    useradd --system --uid 999 -g k8simagemanager k8simagemanager

# hadolint ignore=DL3008
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    ca-certificates \
    sudo \
    wget \
 && case "${TARGETARCH}" in \
      amd64) CRIC_ARCH=amd64 ;; \
      arm64) CRIC_ARCH=arm64 ;; \
      *) echo "unsupported arch: ${TARGETARCH}" && exit 1 ;; \
    esac \
 && wget --progress=dot:giga "https://github.com/kubernetes-sigs/cri-tools/releases/download/v1.35.0/crictl-v1.35.0-linux-${CRIC_ARCH}.tar.gz" \
 && tar -C /usr/local/bin -xzf "crictl-v1.35.0-linux-${CRIC_ARCH}.tar.gz" \
 && chmod +x /usr/local/bin/crictl \
 && printf '%s\n' '#!/usr/bin/env sh' \
    'set -eu' \
    'exec /usr/local/bin/crictl --runtime-endpoint unix:///run/k3s/containerd/containerd.sock images -o json' \
    > /usr/local/bin/crictl-images \
 && chmod 755 /usr/local/bin/crictl-images \
 && chown root:root /usr/local/bin/crictl-images \
 && printf '%s\n' '#!/usr/bin/env sh' \
    'set -eu' \
    "if [ \"\$#\" -ne 1 ]; then" \
    '  echo "usage: crictl-rmi <image-ref>" >&2' \
    '  exit 2' \
    'fi' \
    "exec /usr/local/bin/crictl --runtime-endpoint unix:///run/k3s/containerd/containerd.sock rmi \"\$1\"" \
    > /usr/local/bin/crictl-rmi \
 && chmod 755 /usr/local/bin/crictl-rmi \
 && chown root:root /usr/local/bin/crictl-rmi \
 && printf '%s\n' \
    '#!/usr/bin/env sh' \
    'set -eu' \
    'IFS= read -r ref' \
    'if [ -z "$ref" ]; then' \
    '  echo "usage: crictl-pull reads image ref from stdin" >&2' \
    '  exit 2' \
    'fi' \
    'exec /usr/local/bin/crictl --runtime-endpoint unix:///run/k3s/containerd/containerd.sock pull "$ref"' \
    > /usr/local/bin/crictl-pull \
 && chmod 755 /usr/local/bin/crictl-pull \
 && chown root:root /usr/local/bin/crictl-pull \
 && printf '%s\n' \
    'k8simagemanager ALL=(root) NOPASSWD: /usr/local/bin/crictl-images' \
    'k8simagemanager ALL=(root) NOPASSWD: /usr/local/bin/crictl-rmi *' \
    'k8simagemanager ALL=(root) NOPASSWD: /usr/local/bin/crictl-pull' \
    > /etc/sudoers.d/k8simagemanager-crictl \
 && chmod 440 /etc/sudoers.d/k8simagemanager-crictl \
 && rm -f "crictl-v1.35.0-linux-${CRIC_ARCH}.tar.gz" \
 && rm -rf /var/lib/apt/lists/*

COPY ${TARGETPLATFORM} /usr/bin/k8s-images-manager-agent

RUN chown -R k8simagemanager:k8simagemanager /usr/bin/k8s-images-manager-agent

USER k8simagemanager

ENTRYPOINT ["/usr/bin/k8s-images-manager-agent/k8s-images-manager-agent"]
