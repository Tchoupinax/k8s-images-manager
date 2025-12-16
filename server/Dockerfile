FROM node:25-alpine

WORKDIR /app

COPY package.json yarn.lock .

RUN yarn --production --network-timeout 200000

COPY . .

CMD ["yarn", "start"]
