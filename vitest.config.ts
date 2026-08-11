import { defineConfig } from "vitest/config";

declare global {
  interface ImportMeta {
    dirname: string;
  }
}

export default defineConfig({
  test: {
    include: ["{src,examples}/**/*.test.ts"],
    includeSource: ["examples/*.ts"],
    alias: {
      parsea: `${import.meta.dirname}/src`,
    },
    coverage: {
      include: ["src"],
    },
  },
});
