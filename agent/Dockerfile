# Done from https://goreleaser.com/customization/dockers_v2/#how-it-works
#
# linked dep
# FROM scratch

# alpine 3.23.0
# FROM alpine@sha256:51183f2cfa6320055da30872f211093f9ff1d3cf06f39a0bdb212314c5dc7375

FROM ubuntu:26.04

# ARG TARGETPLATFORM

RUN groupadd --system --gid 999 k8simagemanager && \
    useradd --system --uid 999 -g k8simagemanager k8simagemanager

# hadolint ignore=DL3008
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libsasl2-modules \
    sudo \
    wget \
 && wget --progress=dot:giga https://github.com/kubernetes-sigs/cri-tools/releases/download/v1.35.0/crictl-v1.35.0-linux-amd64.tar.gz \
 && tar -C /usr/local/bin -xzf crictl-v1.35.0-linux-amd64.tar.gz \
 && chmod +x /usr/local/bin/crictl \
 && printf '%s\n' '#!/usr/bin/env sh' \
    'set -eu' \
    'exec /usr/local/bin/crictl --runtime-endpoint unix:///run/k3s/containerd/containerd.sock images' \
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
    'k8simagemanager ALL=(root) NOPASSWD: /usr/local/bin/crictl-images' \
    'k8simagemanager ALL=(root) NOPASSWD: /usr/local/bin/crictl-rmi *' \
    > /etc/sudoers.d/k8simagemanager-crictl \
 && chmod 440 /etc/sudoers.d/k8simagemanager-crictl \
 && rm -f crictl-v1.35.0-linux-amd64.tar.gz \
 && rm -rf /var/lib/apt/lists/*

# $TARGETPLATFORM seems to not to work
# COPY linux/$TARGETPLATFORM/k8s-images-manager-agent /usr/bin/
COPY linux/amd64 /usr/bin/k8s-images-manager-agent

RUN chown -R k8simagemanager:k8simagemanager /usr/bin/k8s-images-manager-agent

USER k8simagemanager

ENTRYPOINT ["/usr/bin/k8s-images-manager-agent/k8s-images-manager-agent"]
