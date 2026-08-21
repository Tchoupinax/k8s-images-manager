FROM node:25-alpine

RUN addgroup -S -g 1001 k8simagemanager && \
    adduser -S -u 1001 -G k8simagemanager k8simagemanager

WORKDIR /app

COPY webapp/.output .output

RUN chown -R k8simagemanager:k8simagemanager /app

USER 1001

CMD ["node", ".output/server/index.mjs"]
