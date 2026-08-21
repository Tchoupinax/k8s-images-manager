# Prisma generate's WASM engine fails on Node 25 linux/arm64 (prisma/prisma#29464).
FROM node:24-alpine

RUN addgroup -S -g 1001 k8simagemanager && \
    adduser -S -u 1001 -G k8simagemanager k8simagemanager

WORKDIR /app

RUN npm i -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/

RUN pnpm install --frozen-lockfile --filter=server

WORKDIR /app/server

COPY server/src src
COPY server/prisma prisma
COPY server/prisma.config.mts prisma.config.mts

RUN npx prisma generate && \
    chown -R k8simagemanager:k8simagemanager /app

USER 1001

CMD ["node", "src/index.mts"]
