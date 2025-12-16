# k8s-images-manager

![frontend](https://img.shields.io/badge/frontend-Nuxt.js-00D492?style=for-the-badge)
![backend](https://img.shields.io/badge/backend-Node.js-6DA55F?style=for-the-badge)
![rust](https://img.shields.io/badge/agent-Rust-brown?style=for-the-badge)

[![Nuxt](https://img.shields.io/badge/Nuxt_v25-00D492?style=for-the-badge&logo=nuxt&logoColor=white)](#)
[![NodeJS](https://img.shields.io/badge/Node.js_v25-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](#)
[![Golang](https://img.shields.io/badge/Rust_v1.92-brown?style=for-the-badge&logo=rust&logoColor=white)](#)

## Getting start

> [!WARNING]
> Rust agent runs as daemonset inside your cluster and requires privileges to be able to list downloaded images
> 
> It requires:
> - [HostNetwork: true](https://github.com/Tchoupinax/k8s-images-manager/blob/master/chart/templates/agents.yaml#L26)
> 
> - [Binding containerd socket (k3s only for now!)](https://github.com/Tchoupinax/k8s-images-manager/blob/21bf40b02947c9b23686ebec0cab99133e35908f/chart/templates/agents.yaml#L66)
> - [Being privileged](https://github.com/Tchoupinax/k8s-images-manager/blob/21bf40b02947c9b23686ebec0cab99133e35908f/chart/values.yaml#L95)
>
> Improvements will be done to limit these requirement in the future.

### With `Helm`

```
helm install k8s-images-manager oci://ghcr.io/tchoupinax --create-namespace -n k8s-images-manager
```

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
