import { number, optional, validate } from "valienv";

export const env = validate({
  env: process.env,
  validators: {
    PORT: optional(number),
  },
});
