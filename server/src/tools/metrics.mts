import client from "prom-client";

import type { PrismaClient } from "../../prisma/generated/prisma/index.js";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const HTTP_DURATION_BUCKETS = [
  0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];
const SIZE_BUCKETS = [64, 256, 1024, 4096, 16_384, 65_536, 262_144, 1_048_576];
const COUNT_BUCKETS = [0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

export const httpRequestsTotal = new client.Counter({
  name: "k8s_images_manager_http_requests_total",
  help: "HTTP requests handled by the server",
  labelNames: ["method", "route", "status"] as const,
  registers: [register],
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: "k8s_images_manager_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: HTTP_DURATION_BUCKETS,
  registers: [register],
});

export const httpRequestSizeBytes = new client.Histogram({
  name: "k8s_images_manager_http_request_size_bytes",
  help: "HTTP request body size in bytes",
  labelNames: ["method", "route"] as const,
  buckets: SIZE_BUCKETS,
  registers: [register],
});

export const httpResponseSizeBytes = new client.Histogram({
  name: "k8s_images_manager_http_response_size_bytes",
  help: "HTTP response body size in bytes",
  labelNames: ["method", "route", "status"] as const,
  buckets: SIZE_BUCKETS,
  registers: [register],
});

export const httpRequestsInFlight = new client.Gauge({
  name: "k8s_images_manager_http_requests_in_flight",
  help: "HTTP requests currently being handled",
  registers: [register],
});

export const httpErrorsTotal = new client.Counter({
  name: "k8s_images_manager_http_errors_total",
  help: "Unhandled errors caught by the global error handler",
  registers: [register],
});

export const registerHeartbeatsTotal = new client.Counter({
  name: "k8s_images_manager_register_heartbeats_total",
  help: "Agent register (heartbeat) requests",
  labelNames: ["result"] as const,
  registers: [register],
});

export const registerNewNodesTotal = new client.Counter({
  name: "k8s_images_manager_register_new_nodes_total",
  help: "New nodes created during register",
  registers: [register],
});

export const registerImagesReported = new client.Histogram({
  name: "k8s_images_manager_register_images_reported",
  help: "Number of images reported in a register payload",
  buckets: COUNT_BUCKETS,
  registers: [register],
});

export const registerDurationSeconds = new client.Histogram({
  name: "k8s_images_manager_register_duration_seconds",
  help: "Time spent handling a register request",
  buckets: HTTP_DURATION_BUCKETS,
  registers: [register],
});

export const commandsDispatchedTotal = new client.Counter({
  name: "k8s_images_manager_commands_dispatched_total",
  help: "Commands returned to agents on register",
  labelNames: ["type"] as const,
  registers: [register],
});

export const commandsDispatched = new client.Histogram({
  name: "k8s_images_manager_commands_dispatched",
  help: "Number of commands of a type returned in one register response",
  labelNames: ["type"] as const,
  buckets: COUNT_BUCKETS,
  registers: [register],
});

export const deletionsQueuedTotal = new client.Counter({
  name: "k8s_images_manager_deletions_queued_total",
  help: "Image deletions queued via the API",
  labelNames: ["source"] as const,
  registers: [register],
});

export const pullsQueuedTotal = new client.Counter({
  name: "k8s_images_manager_pulls_queued_total",
  help: "Image pulls queued via the API",
  registers: [register],
});

export const pullAcksTotal = new client.Counter({
  name: "k8s_images_manager_pull_acks_total",
  help: "Pull acknowledgements received from agents",
  labelNames: ["result"] as const,
  registers: [register],
});

export const pullAcksReceived = new client.Histogram({
  name: "k8s_images_manager_pull_acks_received",
  help: "Number of pull acks in one ACK request",
  buckets: COUNT_BUCKETS,
  registers: [register],
});

export const cleanAllTotal = new client.Counter({
  name: "k8s_images_manager_clean_all_total",
  help: "Clean-all API invocations",
  registers: [register],
});

export const cleanAllImagesQueued = new client.Histogram({
  name: "k8s_images_manager_clean_all_images_queued",
  help: "Unique images queued during a clean-all",
  buckets: COUNT_BUCKETS,
  registers: [register],
});

export const validationErrorsTotal = new client.Counter({
  name: "k8s_images_manager_validation_errors_total",
  help: "Rejected API requests due to missing or invalid input",
  labelNames: ["route"] as const,
  registers: [register],
});

const nodes = new client.Gauge({
  name: "k8s_images_manager_nodes",
  help: "Nodes that have registered at least once",
  registers: [register],
});

const images = new client.Gauge({
  name: "k8s_images_manager_images",
  help: "Image copies currently stored (one row per node per image)",
  registers: [register],
});

const imagesUnique = new client.Gauge({
  name: "k8s_images_manager_images_unique",
  help: "Unique repository:tag combinations currently stored",
  registers: [register],
});

const repositories = new client.Gauge({
  name: "k8s_images_manager_repositories",
  help: "Unique repositories currently stored",
  registers: [register],
});

const imagesBytes = new client.Gauge({
  name: "k8s_images_manager_images_bytes",
  help: "Sum of reported image sizes in bytes across all nodes",
  registers: [register],
});

const pendingDeletions = new client.Gauge({
  name: "k8s_images_manager_pending_deletions",
  help: "Pending image deletions not yet completed on all nodes",
  registers: [register],
});

const pendingPulls = new client.Gauge({
  name: "k8s_images_manager_pending_pulls",
  help: "Pending image pulls not yet acknowledged by all nodes",
  registers: [register],
});

const pendingPullAcks = new client.Gauge({
  name: "k8s_images_manager_pending_pull_acks",
  help: "Pull acknowledgements recorded against pending pulls",
  registers: [register],
});

const pullAckRatio = new client.Gauge({
  name: "k8s_images_manager_pull_ack_ratio",
  help: "Average fraction of nodes that have acked outstanding pulls (1 if none pending)",
  registers: [register],
});

const nodeImages = new client.Gauge({
  name: "k8s_images_manager_node_images",
  help: "Images currently reported on a node",
  labelNames: ["hostname"] as const,
  registers: [register],
});

const nodeBytes = new client.Gauge({
  name: "k8s_images_manager_node_bytes",
  help: "Sum of reported image sizes in bytes on a node",
  labelNames: ["hostname"] as const,
  registers: [register],
});

const nodeLastSeenTimestampSeconds = new client.Gauge({
  name: "k8s_images_manager_node_last_seen_timestamp_seconds",
  help: "Unix timestamp of the last successful register for a node",
  labelNames: ["hostname"] as const,
  registers: [register],
});

export function parseImageSizeBytes(size: string | undefined): number {
  if (!size) {
    return 0;
  }
  const match = size.match(/([\d.]+)\s*([KMGT])?B?/i);
  if (!match) {
    return 0;
  }
  const value = Number.parseFloat(match[1] ?? "0");
  const unit = (match[2] ?? "").toUpperCase();
  const factor =
    unit === "T"
      ? 1024 ** 4
      : unit === "G"
        ? 1024 ** 3
        : unit === "M"
          ? 1024 ** 2
          : unit === "K"
            ? 1024
            : 1;
  return value * factor;
}

export async function collectInventoryMetrics(prisma: PrismaClient): Promise<void> {
  const [nodeRows, imageRows, deletionCount, pullRows, ackCount] =
    await Promise.all([
      prisma.node.findMany({
        select: { hostname: true, updatedAt: true },
      }),
      prisma.image.findMany({
        select: {
          repository: true,
          tag: true,
          size: true,
          node: { select: { hostname: true } },
        },
      }),
      prisma.pendingDeletion.count(),
      prisma.pendingPull.findMany({ select: { id: true } }),
      prisma.pendingPullAck.count(),
    ]);

  nodes.set(nodeRows.length);
  images.set(imageRows.length);
  imagesUnique.set(
    new Set(imageRows.map(img => `${img.repository}:${img.tag}`)).size,
  );
  repositories.set(new Set(imageRows.map(img => img.repository)).size);
  imagesBytes.set(
    imageRows.reduce((sum, img) => sum + parseImageSizeBytes(img.size), 0),
  );
  pendingDeletions.set(deletionCount);
  pendingPulls.set(pullRows.length);
  pendingPullAcks.set(ackCount);

  if (pullRows.length === 0 || nodeRows.length === 0) {
    pullAckRatio.set(1);
  } else {
    const expected = pullRows.length * nodeRows.length;
    pullAckRatio.set(expected === 0 ? 1 : Math.min(1, ackCount / expected));
  }

  nodeImages.reset();
  nodeBytes.reset();
  nodeLastSeenTimestampSeconds.reset();

  const bytesByHost = new Map<string, number>();
  const countByHost = new Map<string, number>();
  for (const img of imageRows) {
    const hostname = img.node.hostname;
    countByHost.set(hostname, (countByHost.get(hostname) ?? 0) + 1);
    bytesByHost.set(
      hostname,
      (bytesByHost.get(hostname) ?? 0) + parseImageSizeBytes(img.size),
    );
  }

  for (const node of nodeRows) {
    nodeImages.set({ hostname: node.hostname }, countByHost.get(node.hostname) ?? 0);
    nodeBytes.set({ hostname: node.hostname }, bytesByHost.get(node.hostname) ?? 0);
    nodeLastSeenTimestampSeconds.set(
      { hostname: node.hostname },
      node.updatedAt.getTime() / 1000,
    );
  }
}

export const prometheus = register;
