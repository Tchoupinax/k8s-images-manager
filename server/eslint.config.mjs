import { eslintTypescript } from "eslint-config-tchoupinax";

export default [
  {
    ignores: [
      "prisma/generated/**",
    ],
  },
  ...eslintTypescript,
];
