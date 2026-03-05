import cors from "@fastify/cors";

import Fastify, { type FastifyInstance } from "fastify";

import type { PrismaClient as PrismaClientType } from "../prisma/generated/prisma/index.js";
import { prisma as defaultPrisma } from "./prisma-client.mts";
import { router } from "./router.mts";
import { type Store } from "./store.mts";
import { env } from "./tools/env.mts";
import { logger, loggerConfig } from "./tools/logger.mts";

declare module "@fastify/request-context" {
  interface RequestContextData {
    store: Store;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClientType;
  }
}

export type CreateServerOptions = {
  prisma?: PrismaClientType;
};

export async function createServer(
  options?: CreateServerOptions,
): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: loggerConfig });
  const prisma = options?.prisma ?? defaultPrisma;
  fastify.decorate("prisma", prisma);

  fastify.register(cors, {
    origin: "http://localhost:3000",
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
