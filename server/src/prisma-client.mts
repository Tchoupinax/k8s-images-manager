import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated/prisma/index.js";

function buildDatabaseUrl(): string {
  const username = process.env.POSTGRES_USERNAME ?? "postgres";
  const password = process.env.POSTGRES_PASSWORD ?? "mysecret";
  const hostname = process.env.POSTGRES_HOSTNAME ?? "localhost";
  const port = process.env.POSTGRES_PORT ?? "5439";
  const database = process.env.POSTGRES_DATABASE ?? "postgres";

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  return `postgresql://${username}:${password}@${hostname}:${port}/${database}`;
}

const connectionString = buildDatabaseUrl();
const adapter = new PrismaPg({ connectionString });
const prismaClient = new PrismaClient({ adapter });

export const prisma = prismaClient;
