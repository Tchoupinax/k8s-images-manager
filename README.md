# k8s-images-manager

See which container images are on each node, then pull or delete them from one screen.

![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?style=flat-square&logo=nuxtdotjs&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-26-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-1.99-000000?style=flat-square&logo=rust&logoColor=white)

## Interface

### Images

Search the inventory, see how many nodes hold each tag, and pull or delete from the row.

![Image inventory with sizes, node counts, and pull or delete actions](.github/docs/images.png)

### Nodes

Pick a few images and see which nodes already have them.

![Selected images compared across cluster nodes](.github/docs/nodes.png)

### Stats

Disk, copies, and registries, plus a history of how the cluster footprint moves.

![Stats for disk usage, per-node size, and registries](.github/docs/stats.png)

## Install

The agent is a DaemonSet. It is not privileged and it does not run as root. It uses the host network so the hostname it reports is the node name, and it mounts the containerd socket. On k3s that socket is `/run/k3s/containerd/containerd.sock`.

### Containerd group

The socket is mode `0660` and belongs to the `containerd` group. The agent process is UID 999, so the pod joins that group through `supplementalGroups`. Kubernetes needs the numeric GID from the node, and that GID has to be the same on every node.

```bash
stat -c '%g %G %a' /run/k3s/containerd/containerd.sock
```

The first field is the GID. Put it in the chart:

```yaml
agents:
  containerdGroup: 989
```

On production nodes the `k3s` Ansible role (`containerd-socket-group.yml`) reads that group and reuses its GID. It creates `containerd` only when the socket is still owned by `root`, then copies the GID the system assigned onto the other nodes. The playbook prints the value to set in `agents.containerdGroup`.

For the local k3d cluster:

```bash
docker exec k3d-k8s-images-manager-server-0 stat -c '%g' /run/k3s/containerd/containerd.sock
```

If `stat` shows `0 root 660`, the socket is still owned by the root group. The Ansible role covers that case on production nodes.

### Helm

```bash
helm install k8s-images-manager oci://ghcr.io/tchoupinax/k8s-images-manager \
  --create-namespace -n k8s-images-manager \
  --set agents.containerdGroup=989
```

Replace `989` with the GID from the playbook, or from `stat` on the socket.

As a dependency:

```yaml
dependencies:
- name: k8s-images-manager
  version: 0.5.7
  repository: oci://ghcr.io/tchoupinax
```

## Development

### Kubernetes (Tilt + k3d)

This runs the full stack (Postgres, server, webapp, and node agents) inside a k3d cluster.

```bash
mise install   # Node 26 and pnpm 12.15.0, see mise.toml
./scripts/dev/tilt-up.sh
```

Use the pnpm from mise (`mise.toml` pins `pnpm@12.15.0`). If you see `Failed to switch pnpm to v12.15.0`, run `mise install` from the project root and make sure your shell loads mise (`eval "$(mise activate bash)"`, or the equivalent for your shell).

Tilt builds images, pushes them to the cluster registry (`localhost:5050`), and installs the Helm chart with `chart/values.local.yaml`. Set `agents.containerdGroup` in that file to the containerd socket GID inside the k3d nodes.

- Web UI: http://k8s-images-manager.127.0.0.1.nip.io
- API: http://api.k8s-images-manager.127.0.0.1.nip.io
- Tilt UI: http://localhost:10350

Tear down the Tilt resources with `./scripts/dev/tilt-down.sh`. Delete the cluster with `./scripts/dev/cluster-delete.sh`.

### UI against the production API

```bash
pnpm ui
```

Opens the Nuxt dev server at http://localhost:3000 against the production API. Pull and delete requests hit production.

### Server only

The server uses PostgreSQL and Prisma.

```bash
docker compose up -d
cd server && pnpm migrate
DATABASE_URL=postgresql://postgres:mysecret@localhost:5439/postgres pnpm start
```

`DATABASE_URL` or the `POSTGRES_*` variables override the default `postgresql://postgres:mysecret@localhost:5439/postgres`.

## Why

If you manage a cluster, you know Docker Hub rate limits hurt when you did not plan for them. One way through is an [embedded registry mirror](https://docs.k3s.io/installation/registry-mirror), which is what I wanted on k3s.

To know the mirror is actually doing its job, I need to see how images are spread across the nodes. That is this project.

## Roadmap

- [ ] Other Kubernetes distributions
  - [x] k3s
  - [ ] Minikube
  - [ ] EKS
  - [ ] GKE
  - [ ] Talos
- [ ] Docker engine
- [ ] Smaller agent binary (`scratch`)
- [ ] Richer nodes dashboard
