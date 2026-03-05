import path from "node:path";

import { defineConfig } from "prisma/config";

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

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: buildDatabaseUrl(),
  },
});
