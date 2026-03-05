import { number, optional, string, validate } from "valienv";

export const env = validate({
  env: process.env,
  validators: {
    PORT: optional(number),
    DATABASE_URL: optional(string),

    POSTGRES_USERNAME: optional(string),
    POSTGRES_PASSWORD: optional(string),
    POSTGRES_HOSTNAME: optional(string),
    POSTGRES_PORT: optional(string),
    POSTGRES_DATABASE: optional(string),
  },
});
