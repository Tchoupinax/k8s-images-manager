import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

import type { FastifyInstance } from "fastify";
import { PrismaPGlite } from "pglite-prisma-adapter";

import { PrismaClient } from "../prisma/generated/prisma/index.js";
import { createServer } from "../src/server.mts";

export type TestApp = {
  app: FastifyInstance;
  inject: FastifyInstance["inject"];
  prisma: PrismaClient;
  pglite: PGlite;
};

async function runMigrations(pglite: PGlite): Promise<void> {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const entries = readdirSync(migrationsDir, { withFileTypes: true });
  const migrationDirs = entries
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  for (const dir of migrationDirs) {
    const sqlPath = path.join(migrationsDir, dir, "migration.sql");
    try {
      const sql = readFileSync(sqlPath, "utf-8");
      await pglite.exec(sql);
    } catch {
      // skip if no migration.sql
    }
  }
}

export async function createTestApp(): Promise<TestApp> {
  const pglite = new PGlite();
  await runMigrations(pglite);

  const adapter = new PrismaPGlite(pglite);
  const prisma = new PrismaClient({ adapter });

  const app = await createServer({ prisma });

  return {
    app,
    inject: app.inject.bind(app),
    prisma,
    pglite,
  };
}

export async function testWithApp(
  fn: (config: TestApp) => Promise<void>,
): Promise<void> {
  const { app, prisma, pglite, ...rest } = await createTestApp();
  try {
    await fn({ app, prisma, pglite, ...rest });
  } finally {
    await app.close();
    await prisma.$disconnect();
    await pglite.close();
  }
}
