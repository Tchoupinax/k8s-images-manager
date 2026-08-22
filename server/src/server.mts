import cors from "@fastify/cors";

import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";

import type { PrismaClient as PrismaClientType } from "../prisma/generated/prisma/index.js";
import { prisma as defaultPrisma } from "./prisma-client.mts";
import { router } from "./router.mts";
import { type Store } from "./store.mts";
import { env } from "./tools/env.mts";
import { isProduction, logger } from "./tools/logger.mts";
import {
  httpRequestDurationSeconds,
  httpRequestSizeBytes,
  httpRequestsInFlight,
  httpRequestsTotal,
  httpResponseSizeBytes,
} from "./tools/metrics.mts";

declare module "@fastify/request-context" {
  interface RequestContextData {
    store: Store;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClientType;
  }
  interface FastifyRequest {
    metricsStartedAt: bigint;
  }
}

export type CreateServerOptions = {
  prisma?: PrismaClientType;
};

function routeLabel(request: { routeOptions?: { url?: string } }): string {
  return request.routeOptions?.url ?? "unmatched";
}

export async function createServer(
  options?: CreateServerOptions,
): Promise<FastifyInstance> {
  const fastify = Fastify({
    loggerInstance: logger as FastifyBaseLogger,
    disableRequestLogging: isProduction,
  });
  const prisma = options?.prisma ?? defaultPrisma;

  fastify.decorate("prisma", prisma);
  fastify.decorateRequest("metricsStartedAt", 0n);

  fastify.addHook("onRequest", (request, _, done) => {
    request.metricsStartedAt = process.hrtime.bigint();
    httpRequestsInFlight.inc();
    done();
  });

  fastify.addHook("onResponse", (request, reply, done) => {
    httpRequestsInFlight.dec();
    const method = request.method;
    const route = routeLabel(request);
    const status = String(reply.statusCode);
    const elapsedNs = Number(process.hrtime.bigint() - request.metricsStartedAt);
    httpRequestsTotal.inc({ method, route, status });
    httpRequestDurationSeconds.observe({ method, route, status }, elapsedNs / 1e9);
    httpRequestSizeBytes.observe(
      { method, route },
      Number(request.headers["content-length"] ?? 0),
    );
    httpResponseSizeBytes.observe(
      { method, route, status },
      Number(reply.getHeader("content-length") ?? 0),
    );
    done();
  });

  fastify.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  await fastify.register(router);

  return fastify;
}

export async function startServer() {
  const server = await createServer();

  const port = env.PORT.defined ? env.PORT.value : 9999;

  try {
    await server.listen({ port, host: "0.0.0.0" });
    logger.info(`Listening on ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}
