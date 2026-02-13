import Fastify from "fastify";
import cors from "@fastify/cors";

import { logger, loggerConfig } from "./logger.mts";
import { router } from "./router.mts";
import { type Store } from "./store.mts";
import { env } from "./tools/env.mts";

declare module "@fastify/request-context" {
  interface RequestContextData {
    store: Store;
  }
}

export async function createServer() {
  const fastify = Fastify({ logger: loggerConfig });

  //https://github.com/fastify/fastify-cors
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
