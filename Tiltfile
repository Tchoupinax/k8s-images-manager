# Local k3d + Helm environment. Start with: ./scripts/dev/tilt-up.sh

load("ext://restart_process", "docker_build_with_restart")

allow_k8s_contexts("k3d-k8s-images-manager")

# Buildx attestations make k3s/containerd try to run a manifest with no CMD.
os.putenv("BUILDX_NO_DEFAULT_ATTESTATIONS", "1")

default_registry(
    "localhost:5050",
    host_from_cluster="k8s-images-manager-registry:5000",
)

k8s_yaml(blob("""
apiVersion: v1
kind: Namespace
metadata:
  name: k8s-images-manager
"""))

docker_build_with_restart(
    "server",
    ".",
    dockerfile="server/Dockerfile",
    entrypoint="sh -c 'npx prisma generate && npx prisma migrate deploy && exec node src/index.mts'",
    only=[
        "package.json",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        "server",
    ],
    live_update=[
        sync("./server/src", "/app/server/src"),
        sync("./server/prisma", "/app/server/prisma"),
        sync("./server/prisma.config.mts", "/app/server/prisma.config.mts"),
    ],
)

docker_build(
    "webapp",
    ".",
    dockerfile="webapp/Dockerfile.dev",
    only=[
        "package.json",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        "webapp",
    ],
    ignore=[
        "webapp/node_modules",
        "webapp/.nuxt",
        "webapp/.output",
    ],
)

docker_build(
    "agent",
    ".",
    dockerfile="agent/Dockerfile.dev",
    only=[
        "agent/src",
        "agent/Cargo.toml",
        "agent/Cargo.lock",
        "agent/Dockerfile.dev",
        "agent/scripts",
    ],
)

k8s_yaml(helm(
    "./chart",
    name="k8s-images-manager",
    namespace="k8s-images-manager",
    values=["./chart/values.local.yaml"],
))

k8s_resource(
    "server",
    labels=["app"],
    resource_deps=["postgres"],
    links=["http://api.k8s-images-manager.127.0.0.1.nip.io"],
)

k8s_resource(
    "webapp",
    labels=["app"],
    resource_deps=["server"],
    links=["http://k8s-images-manager.127.0.0.1.nip.io"],
)

k8s_resource(
    "agents",
    labels=["app"],
    resource_deps=["server"],
)

k8s_resource(
    "postgres",
    labels=["data"],
)
