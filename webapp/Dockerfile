FROM node:25-alpine

RUN addgroup -S -g 999 k8simagemanager && \
    adduser -S -u 999 -G k8simagemanager k8simagemanager

WORKDIR /app

COPY webapp/.output .output

RUN chown -R k8simagemanager:k8simagemanager /app

USER k8simagemanager

CMD ["node", ".output/server/index.mjs"]
