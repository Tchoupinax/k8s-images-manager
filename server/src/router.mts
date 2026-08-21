import fastifyRequestContext from "@fastify/request-context";

import { type FastifyInstance } from "fastify";

import type { PrismaClient } from "../prisma/generated/prisma/index.js";
import { logger } from "./tools/logger.mts";
import {
  cleanAllImagesQueued,
  cleanAllTotal,
  collectInventoryMetrics,
  commandsDispatched,
  commandsDispatchedTotal,
  deletionsQueuedTotal,
  httpErrorsTotal,
  prometheus,
  pullAcksReceived,
  pullAcksTotal,
  pullsQueuedTotal,
  registerDurationSeconds,
  registerHeartbeatsTotal,
  registerImagesReported,
  registerNewNodesTotal,
  validationErrorsTotal,
} from "./tools/metrics.mts";

type ImageRecord = Record<string, string>;

type ImageCommand = {
  repository: string;
  tag: string;
};

function imageKey(repository: string, tag: string): string {
  return `${repository}:${tag}`;
}

async function queueImageDeletion(
  prisma: PrismaClient,
  repository: string,
  tag: string,
) {
  await prisma.pendingPullAck.deleteMany({
    where: { repository, tag },
  });
  await prisma.pendingPull.deleteMany({
    where: { repository, tag },
  });

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
}

async function cleanupDeletions(prisma: PrismaClient) {
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

async function cleanupPulls(prisma: PrismaClient) {
  const pending = await prisma.pendingPull.findMany();
  const nodeCount = await prisma.node.count();
  for (const { repository, tag } of pending) {
    const ackCount = await prisma.pendingPullAck.count({
      where: { repository, tag },
    });
    const nodesWithImage = await prisma.image.findMany({
      where: { repository, tag },
      distinct: ["nodeId"],
      select: { nodeId: true },
    });
    if (
      nodeCount > 0 &&
      (ackCount >= nodeCount || nodesWithImage.length >= nodeCount)
    ) {
      await prisma.pendingPullAck.deleteMany({
        where: { repository, tag },
      });
      await prisma.pendingPull.deleteMany({
        where: { repository, tag },
      });
    }
  }
}

async function recordPullAck(
  prisma: PrismaClient,
  nodeId: string,
  repository: string,
  tag: string,
) {
  const pending = await prisma.pendingPull.findUnique({
    where: { repository_tag: { repository, tag } },
  });
  if (!pending) {
    return;
  }

  await prisma.pendingPullAck.upsert({
    where: {
      nodeId_repository_tag: { nodeId, repository, tag },
    },
    create: { nodeId, repository, tag },
    update: {},
  });
}

export function router(fastify: FastifyInstance) {
  fastify.register(fastifyRequestContext);

  fastify.get("/health", () => "OK");
  fastify.get("/metrics", async (request, reply) => {
    await collectInventoryMetrics(request.server.prisma);
    reply.header("Content-Type", prometheus.contentType);
    return await prometheus.metrics();
  });

  fastify.register(
    function (app) {
      app.post("/register", async (request, reply) => {
        const prisma = request.server.prisma;
        const hostname = request.headers.hostname as string;
        const payload = request.body as Array<ImageRecord>;
        const started = process.hrtime.bigint();

        if (!hostname) {
          validationErrorsTotal.inc({ route: "/api/register" });
          reply.code(400).send({ message: "hostname header is required" });
          return;
        }

        const existing = await prisma.node.findUnique({ where: { hostname } });
        if (!existing) {
          registerNewNodesTotal.inc();
        }

        const node = await prisma.$transaction(async tx => {
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

          return node;
        });

        const reportedKeys = new Set(
          payload.map(img => imageKey(img.repository ?? "", img.tag ?? "")),
        );
        const pendingPulls = await prisma.pendingPull.findMany();
        for (const pull of pendingPulls) {
          if (reportedKeys.has(imageKey(pull.repository, pull.tag))) {
            await recordPullAck(prisma, node.id, pull.repository, pull.tag);
          }
        }

        await cleanupDeletions(prisma);
        await cleanupPulls(prisma);

        const [deletions, pulls, acks] = await Promise.all([
          prisma.pendingDeletion.findMany(),
          prisma.pendingPull.findMany(),
          prisma.pendingPullAck.findMany({
            where: { nodeId: node.id },
          }),
        ]);
        const ackedKeys = new Set(
          acks.map(ack => imageKey(ack.repository, ack.tag)),
        );
        const pullsForNode = pulls.filter(
          p => !ackedKeys.has(imageKey(p.repository, p.tag)),
        );

        registerHeartbeatsTotal.inc({ result: "ok" });
        registerImagesReported.observe(payload.length);
        commandsDispatchedTotal.inc({ type: "delete" }, deletions.length);
        commandsDispatchedTotal.inc({ type: "pull" }, pullsForNode.length);
        commandsDispatched.observe({ type: "delete" }, deletions.length);
        commandsDispatched.observe({ type: "pull" }, pullsForNode.length);
        registerDurationSeconds.observe(
          Number(process.hrtime.bigint() - started) / 1e9,
        );

        reply
          .code(200)
          .header("Content-Type", "application/json; charset=utf-8")
          .send({
            ok: true,
            deletions: deletions.map((d): ImageCommand => ({
              repository: d.repository,
              tag: d.tag,
            })),
            pulls: pullsForNode.map((p): ImageCommand => ({
              repository: p.repository,
              tag: p.tag,
            })),
          });
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
          validationErrorsTotal.inc({ route: "/api/images" });
          reply.code(400).send({
            message: "repository and tag query parameters are required",
          });
          return;
        }

        await queueImageDeletion(prisma, repository, tag);
        deletionsQueuedTotal.inc({ source: "single" });

        reply.code(200).send({ ok: true });
      });

      app.delete("/images/all", async (request, reply) => {
        const prisma = request.server.prisma;
        const images = await prisma.image.findMany({
          select: { repository: true, tag: true },
        });
        const unique = [
          ...new Map(
            images.map(img => [imageKey(img.repository, img.tag), img]),
          ).values(),
        ];

        for (const { repository, tag } of unique) {
          await queueImageDeletion(prisma, repository, tag);
        }

        cleanAllTotal.inc();
        cleanAllImagesQueued.observe(unique.length);
        deletionsQueuedTotal.inc({ source: "all" }, unique.length);

        reply.code(200).send({ ok: true, count: unique.length });
      });

      app.post("/images/pull", async (request, reply) => {
        const prisma = request.server.prisma;
        const { repository, tag } = request.query as {
          repository?: string;
          tag?: string;
        };

        if (!repository || !tag) {
          validationErrorsTotal.inc({ route: "/api/images/pull" });
          reply.code(400).send({
            message: "repository and tag query parameters are required",
          });
          return;
        }

        await prisma.pendingDeletion.deleteMany({
          where: { repository, tag },
        });
        await prisma.pendingPullAck.deleteMany({
          where: { repository, tag },
        });

        await prisma.pendingPull.upsert({
          where: {
            repository_tag: { repository, tag },
          },
          create: { repository, tag },
          update: {},
        });

        pullsQueuedTotal.inc();

        reply.code(200).send({ ok: true });
      });

      app.post("/images/pull/ack", async (request, reply) => {
        const prisma = request.server.prisma;
        const hostname = request.headers.hostname as string;
        if (!hostname) {
          validationErrorsTotal.inc({ route: "/api/images/pull/ack" });
          reply.code(400).send({
            message: "hostname header is required",
          });
          return;
        }

        const payload = request.body;
        const commands = (Array.isArray(payload) ? payload : [payload]) as Array<
          Partial<ImageCommand>
        >;

        const node = await prisma.node.findUnique({ where: { hostname } });
        if (!node) {
          pullAcksTotal.inc({ result: "unknown_node" });
          reply.code(404).send({ message: "unknown node" });
          return;
        }

        let recorded = 0;
        for (const command of commands) {
          const repository = command?.repository;
          const tag = command?.tag;
          if (!repository || !tag) {
            pullAcksTotal.inc({ result: "invalid" });
            continue;
          }
          await recordPullAck(prisma, node.id, repository, tag);
          recorded += 1;
          pullAcksTotal.inc({ result: "ok" });
        }

        pullAcksReceived.observe(recorded);
        await cleanupPulls(prisma);

        reply.code(200).send({ ok: true });
      });
    },
    { prefix: "/api" },
  );

  fastify.setErrorHandler(async (error, _, reply) => {
    console.log("Global error caught", error);
    httpErrorsTotal.inc();
    reply.status(500).send({ msg: "Error" });
  });

  logger.info("Router mounted");
}
