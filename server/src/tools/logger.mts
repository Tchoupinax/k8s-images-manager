import pino, { type LoggerOptions } from "pino";

const isProduction = process.env.NODE_ENV === "production";

const config: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  base: null,
};

if (!isProduction) {
  config.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: "HH:MM:ss.l",
    },
  } satisfies LoggerOptions["transport"];
}

export const loggerConfig = config;
export const logger = pino(config);

export { isProduction };
