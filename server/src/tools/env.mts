import { string, optional, validate, number } from "valienv";

export const env = validate({
  env: process.env,
  validators: {
    PORT: optional(number), 
  },
});
