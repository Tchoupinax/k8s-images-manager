# Prisma generate is unreliable on newer Node linux/arm64 (prisma/prisma#29464).
FROM node:24-alpine AS build

WORKDIR /app

RUN npm i -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/

# hadolint ignore=DL3042
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --store-dir /root/.pnpm-store --filter=server...

COPY server/src server/src
COPY server/prisma server/prisma
COPY server/prisma.config.mts server/prisma.config.mts

# generated/ is gitignored, so pnpm deploy would skip it — copy it into the deploy root.
RUN pnpm --filter=server exec prisma generate \
    && pnpm --filter=server deploy --prod --legacy --ignore-scripts /out \
    && mkdir -p /out/prisma \
    && cp -a server/prisma/generated /out/prisma/generated

FROM node:24-alpine

RUN addgroup -S -g 1001 k8simagemanager && \
    adduser -S -u 1001 -G k8simagemanager k8simagemanager

WORKDIR /app

ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=96 --max-semi-space-size=4" \
    UV_THREADPOOL_SIZE=2

COPY --from=build --chown=1001:1001 /out ./

USER 1001

CMD ["node", "--no-warnings", "--experimental-strip-types", "src/index.mts"]
