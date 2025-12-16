# k8s-images-manager

![frontend](https://img.shields.io/badge/frontend-Nuxt.js-green?style=for-the-badge)
![backend](https://img.shields.io/badge/backend-Node.js-purple?style=for-the-badge)
![rust](https://img.shields.io/badge/agent-Rust-brown?style=for-the-badge)

[![NodeJS](https://img.shields.io/badge/Node.js_v24-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](#)
[![Golang](https://img.shields.io/badge/Golang_v1.24-118293?style=for-the-badge&logo=go&logoColor=white)](#)
[![Golang](https://img.shields.io/badge/Rust_v1.92-brown?style=for-the-badge&logo=rust&logoColor=white)](#)

## Getting start

> [!WARNING]
> Rust agent runs as daemonset inside your cluster and requires privileges to be able to list downloaded images
> 
> It requires:
> - [HostNetwork: true](https://github.com/Tchoupinax/k8s-images-manager/blob/master/chart/templates/agents.yaml#L26)
> 
> - [Binding containerd socket (k3s only for now!)](https://github.com/Tchoupinax/k8s-images-manager/blob/21bf40b02947c9b23686ebec0cab99133e35908f/chart/templates/agents.yaml#L66)
> - [Being privilegied](https://github.com/Tchoupinax/k8s-images-manager/blob/21bf40b02947c9b23686ebec0cab99133e35908f/chart/values.yaml#L95)
>
> Improvements will be done to limit these requirement in the future.

## With `Helm`

```
helm install k8s-images-manager oci://ghcr.io/tchoupinax --create-namespace -n k8s-images-manager
```

### With `Chart.yaml` and Helm

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

## Roadmap

- [ ] Provide first dashboard
- [ ] Make agent compatible with Docker engine
- [ ] Make agent binary the most light possible (using scratch)
