import type { PrismaClient } from "../prisma/generated/prisma/index.js";
import { getNodeStaleAfterMs } from "./tools/env.mts";

export async function cleanupStaleNodes(prisma: PrismaClient) {
  const cutoff = new Date(Date.now() - getNodeStaleAfterMs());
  await prisma.node.deleteMany({
    where: { updatedAt: { lt: cutoff } },
  });
}

export async function cleanupDeletions(prisma: PrismaClient) {
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

export async function cleanupPulls(prisma: PrismaClient) {
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

export async function runMaintenance(prisma: PrismaClient) {
  await cleanupStaleNodes(prisma);
  await cleanupDeletions(prisma);
  await cleanupPulls(prisma);
}
