# k8s-images-manager

![frontend](https://img.shields.io/badge/frontend-Nuxt.js-00D492?style=for-the-badge)
![backend](https://img.shields.io/badge/backend-Node.js-6DA55F?style=for-the-badge)
![rust](https://img.shields.io/badge/agent-Rust-brown?style=for-the-badge)

[![Nuxt](https://img.shields.io/badge/Nuxt_v25-00D492?style=for-the-badge&logo=nuxt&logoColor=white)](#)
[![NodeJS](https://img.shields.io/badge/Node.js_v25-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](#)
[![Golang](https://img.shields.io/badge/Rust_v1.92-brown?style=for-the-badge&logo=rust&logoColor=white)](#)

## Development

### Kubernetes (Tilt + k3d)

This is the local environment used to run the full stack (Postgres, server, webapp, and node agents) inside a k3d cluster.

```bash
mise install   # installs Node 26 and pnpm 12.4.2 (see mise.toml)
./scripts/dev/tilt-up.sh
```

Use the pnpm from mise in this repo (`mise.toml` pins `pnpm@12.4.2`). If you see `Failed to switch pnpm to v12.4.2`, run `mise install` from the project root and ensure your shell loads mise (`eval "$(mise activate bash)"` or the equivalent for your shell).

Tilt builds images, pushes them to the cluster registry (`localhost:5050`), and installs the Helm chart with `chart/values.local.yaml`. Set `agents.containerdGroup` in that file to the containerd socket GID inside the k3d nodes (see [Containerd group](#containerd-group)).

- Web UI: http://k8s-images-manager.127.0.0.1.nip.io
- API: http://api.k8s-images-manager.127.0.0.1.nip.io
- Tilt UI: http://localhost:10350

Tear down the Tilt resources with `./scripts/dev/tilt-down.sh`. Delete the cluster with `./scripts/dev/cluster-delete.sh`.

### UI against production API

Start only the Nuxt app locally, talking to the production API:

```bash
pnpm ui
```

Opens the usual Nuxt dev server (http://localhost:3000) with `NUXT_PUBLIC_SERVER_ENDPOINT=https://k8s-images-manager.mysupercloud.dev`. Pull and delete requests hit production.

### Docker Compose (server only)

The server uses PostgreSQL and Prisma. To run locally with Docker:

```bash
docker compose up -d
cd server && pnpm migrate
DATABASE_URL=postgresql://postgres:mysecret@localhost:5439/postgres pnpm start
```

Or set `DATABASE_URL` (or `POSTGRES_*` env vars) and run the server. Default without env: `postgresql://postgres:mysecret@localhost:5439/postgres`.

## Getting start

The agent runs as a DaemonSet. It is not privileged and it does not run as root. It still needs the host network (so the hostname it reports is the node name) and a mount of the containerd socket. On k3s that socket is `/run/k3s/containerd/containerd.sock`.

### Containerd group

The socket is mode `0660` and belongs to the `containerd` group. The agent process is UID 999, so the pod joins that group through `supplementalGroups`. Kubernetes needs the numeric GID from the node, and that GID has to be the same on every node.

Read it on a node:

```bash
stat -c '%g %G %a' /run/k3s/containerd/containerd.sock
```

The first field is the GID of the group that already owns the socket. Put that number in the chart:

```yaml
agents:
  containerdGroup: 989
```

On production nodes the `k3s` Ansible role (`containerd-socket-group.yml`) does this itself. It reads that group and reuses its GID. It creates `containerd` only when the socket is still owned by `root`, then copies the GID the system assigned onto the other nodes. The playbook prints the value to set in `agents.containerdGroup`.

For the local k3d cluster, read the GID inside a node and set `agents.containerdGroup` in `chart/values.local.yaml`:

```bash
docker exec k3d-k8s-images-manager-server-0 stat -c '%g' /run/k3s/containerd/containerd.sock
```

If `stat` shows `0 root 660`, the socket is still owned by the root group. The Ansible role covers that case on production nodes.

### With `Helm`

```
helm install k8s-images-manager oci://ghcr.io/tchoupinax \
  --create-namespace -n k8s-images-manager \
  --set agents.containerdGroup=989
```

Replace `989` with the GID printed by the playbook, or by `stat` on the socket.

### With `Chart.yaml` and `Helm`

```
apiVersion: v2
name: k8s-images-manager
type: application
version: 1.0.0

dependencies:
- name: k8s-images-manager
  version: 0.1.0
  repository: oci://ghcr.io/tchoupinax
```
## Motivation

If you manager a cluster, you know that Dockerhub's rate limit can be hard if you did not anticipate it. There are many tips to handle it, one is to have an [embedded registry mirror](https://docs.k3s.io/installation/registry-mirror) that I wanted to setup with k3s.

But to check that this registry is working, I need to monitor how images are managed accros the nodes.

That's the reason of this project, and that's all. Sometimes, it's really simple.

## Features

### List images from the cluster

To be done

### Show which nodes have specific images
![](.github/docs/nodes.png)

## Roadmap

- [ ] Make agent compatible with Kubernetes distribution
    - [x] k3s
    - [ ] Minikube
    - [ ] EKS
    - [ ] GKE
    - [ ] Talos
- [ ] Make agent compatible with Docker engine
- [ ] Make agent binary the most light possible (using scratch)
- [ ] Improve UI
  - [ ] Nodes dashboard
