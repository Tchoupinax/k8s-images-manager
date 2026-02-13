import fastifyRequestContext from "@fastify/request-context";

import { type FastifyInstance } from "fastify";
import { prometheus } from "./tools/metrics.mts";

import { logger } from "./logger.mts";

const data = new Map<string, Array<Record<string, string>>>();

export function router(fastify: FastifyInstance) {
  fastify.register(fastifyRequestContext);

  fastify.get("/health", () => "OK");
  fastify.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", prometheus.contentType);
    return await prometheus.metrics();
  });

  fastify.register(
    function (app, _, done) {
      app.post("/register", (request, response) => {
        data.set(
          request.headers.hostname as string,
          request.body as Array<Record<string, string>>,
        );
        response.send("OK");
      });

      app.get("/images", (_, reply) => {
        const returnedValues = Array.from(data.keys()).map((key) => {
          return data.get(key)!.map((image) => ({
            hostname: key,
            ...image,
          }));
        });

        reply
          .code(200)
          .header("Content-Type", "application/json; charset=utf-8")
          .send(returnedValues.flat());
      });

      done();
    },
    { prefix: "/api" },
  );

  fastify.setErrorHandler(async (error, _, reply) => {
    console.log("Global error caught", error);
    reply.status(500).send({ msg: "Error" });
  });

  logger.info("Router mounted");
}
