cd agent && cargo build --release && cd ..

docker buildx build \
  --platform=linux/amd64,linux/arm64 \
  -t tchoupinax/k8s-images-manager:agent-v0.0.18 \
  -f agent/Dockerfile.linux \
  agent \
  --push

docker buildx build \
  --platform=linux/amd64,linux/arm64 \
  -t tchoupinax/k8s-images-manager:server-v0.0.42-rc1 \
  server \
  --push
