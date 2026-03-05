import fastifyRequestContext from "@fastify/request-context";

import { type FastifyInstance } from "fastify";
import { prometheus } from "./tools/metrics.mts";

import { logger } from "./logger.mts";

type ImageRecord = Record<string, string>;

type DeletionCommand = {
  repository: string;
  tag: string;
};

const data = new Map<string, Array<ImageRecord>>();
const deletions: DeletionCommand[] = [];

const upsertDeletion = (repository: string, tag: string) => {
  if (!deletions.some((d) => d.repository === repository && d.tag === tag)) {
    deletions.push({ repository, tag });
  }
};

const cleanupDeletions = () => {
  for (let i = deletions.length - 1; i >= 0; i--) {
    const { repository, tag } = deletions[i];
    const stillPresent = Array.from(data.values()).some((images) =>
      images.some(
        (image) => image.repository === repository && image.tag === tag,
      ),
    );

    if (!stillPresent) {
      deletions.splice(i, 1);
    }
  }
};

export function router(fastify: FastifyInstance) {
  fastify.register(fastifyRequestContext);

  fastify.get("/health", () => "OK");
  fastify.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", prometheus.contentType);
    return await prometheus.metrics();
  });

  fastify.register(
    function (app, _, done) {
      app.post("/register", (request, reply) => {
        data.set(
          request.headers.hostname as string,
          request.body as Array<ImageRecord>,
        );

        cleanupDeletions();
        reply
          .code(200)
          .header("Content-Type", "application/json; charset=utf-8")
          .send({ ok: true, deletions });
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

      app.delete("/images", (request, reply) => {
        const { repository, tag } = request.query as {
          repository?: string;
          tag?: string;
        };

        if (!repository || !tag) {
          reply.code(400).send({
            message: "repository and tag query parameters are required",
          });
          return;
        }

        upsertDeletion(repository, tag);

        for (const [hostname, images] of data.entries()) {
          const filtered = images.filter(
            (image) => !(image.repository === repository && image.tag === tag),
          );
          data.set(hostname, filtered);
        }

        reply.code(200).send({ ok: true });
      });

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
