FROM node:25-alpine

RUN addgroup -S -g 1001 k8simagemanager && \
    adduser -S -u 1001 -G k8simagemanager k8simagemanager

WORKDIR /app

RUN npm i -g pnpm

COPY server/package.json pnpm-lock.yaml ./

RUN pnpm install

COPY server/src src
COPY server/prisma prisma
COPY server/prisma.config.mts prisma.config.mts

RUN npx prisma generate && \
    chown -R k8simagemanager:k8simagemanager /app

USER k8simagemanager

CMD ["node", "src/index.mts"]
