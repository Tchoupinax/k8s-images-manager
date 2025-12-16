# Done from https://goreleaser.com/customization/dockers_v2/#how-it-works
#
# linked dep
# FROM scratch

# alpine 3.23.0
# FROM alpine@sha256:51183f2cfa6320055da30872f211093f9ff1d3cf06f39a0bdb212314c5dc7375

FROM ubuntu

# ARG TARGETPLATFORM

ENTRYPOINT ["/usr/bin/k8s-images-manager-agent/k8s-images-manager-agent"]

RUN apt-get clean \
 && rm -rf /var/lib/apt/lists/* \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
    curl \
    libsasl2-modules \
 && rm -rf /var/lib/apt/lists/*

RUN apt update && apt install -y ca-certificates
RUN apt install -y wget
RUN wget https://github.com/kubernetes-sigs/cri-tools/releases/download/v1.35.0/crictl-v1.35.0-linux-amd64.tar.gz
RUN tar -C /usr/local/bin -xzf crictl-v1.35.0-linux-amd64.tar.gz
RUN chmod +x /usr/local/bin/crictl

# $TARGETPLATFORM seems to not to work
# COPY linux/$TARGETPLATFORM/k8s-images-manager-agent /usr/bin/
COPY linux/amd64 /usr/bin/k8s-images-manager-agent

# rustup target add x86_64-unknown-linux-musl
# cargo build --release --target x86_64-unknown-linux-musl
