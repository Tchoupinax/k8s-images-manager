FROM node:25-alpine

WORKDIR /app

RUN npm i -g pnpm

COPY server/package.json pnpm-lock.yaml .

RUN pnpm install

COPY server/src src
COPY server/prisma prisma
COPY server/prisma.config.mts prisma.config.mts

CMD ["node", "src/index.mts"]
