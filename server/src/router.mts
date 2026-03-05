import fastifyRequestContext from "@fastify/request-context";

import { type FastifyInstance } from "fastify";

import { logger } from "./tools/logger.mts";
import { prometheus } from "./tools/metrics.mts";

type ImageRecord = Record<string, string>;

type DeletionCommand = {
  repository: string;
  tag: string;
};

export function router(fastify: FastifyInstance) {
  fastify.register(fastifyRequestContext);

  fastify.get("/health", () => "OK");
  fastify.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", prometheus.contentType);
    return await prometheus.metrics();
  });

  fastify.register(
    function (app) {
      app.post("/register", async (request, reply) => {
        const prisma = request.server.prisma;
        const hostname = request.headers.hostname as string;
        const payload = request.body as Array<ImageRecord>;

        async function cleanupDeletions() {
          const pending = await prisma.pendingDeletion.findMany();
          for (const { repository, tag } of pending) {
            const count = await prisma.image.count({
              where: { repository, tag },
            });
            if (count === 0) {
              await prisma.pendingDeletion.deleteMany({
                where: { repository, tag },
              });
            }
          }
        }

        await prisma.$transaction(async tx => {
          const node =
            (await tx.node.findUnique({ where: { hostname } })) ??
            (await tx.node.create({ data: { hostname } }));

          await tx.image.deleteMany({ where: { nodeId: node.id } });

          if (payload.length > 0) {
            await tx.image.createMany({
              data: payload.map(img => ({
                nodeId: node.id,
                repository: img.repository ?? "",
                tag: img.tag ?? "",
                digest: img.digest ?? "",
                size: img.size ?? "",
                date: (img as { date?: string }).date ?? new Date().toISOString(),
              })),
            });
          }
        });

        await cleanupDeletions();

        const deletions = await prisma.pendingDeletion.findMany();
        const deletionCommands: DeletionCommand[] = deletions.map(d => ({
          repository: d.repository,
          tag: d.tag,
        }));

        reply
          .code(200)
          .header("Content-Type", "application/json; charset=utf-8")
          .send({ ok: true, deletions: deletionCommands });
      });

      app.get("/images", async (request, reply) => {
        const prisma = request.server.prisma;
        const images = await prisma.image.findMany({
          include: { node: true },
        });

        const flat = images.map(img => ({
          hostname: img.node.hostname,
          repository: img.repository,
          tag: img.tag,
          digest: img.digest,
          size: img.size,
          date: img.date,
        }));

        reply
          .code(200)
          .header("Content-Type", "application/json; charset=utf-8")
          .send(flat);
      });

      app.delete("/images", async (request, reply) => {
        const prisma = request.server.prisma;
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

        await prisma.pendingDeletion.upsert({
          where: {
            repository_tag: { repository, tag },
          },
          create: { repository, tag },
          update: {},
        });

        await prisma.image.deleteMany({
          where: { repository, tag },
        });

        reply.code(200).send({ ok: true });
      });
    },
    { prefix: "/api" },
  );

  fastify.setErrorHandler(async (error, _, reply) => {
    console.log("Global error caught", error);
    reply.status(500).send({ msg: "Error" });
  });

  logger.info("Router mounted");
}
